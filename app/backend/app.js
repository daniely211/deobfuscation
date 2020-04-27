var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const recast = require("recast");
const putout = require('putout');
const Iroh = require("iroh");
var indexRouter = require('./routes/index');
var cors = require("cors");
var bodyParser = require('body-parser');
var jstiller = require('./Jstillery/src/jstiller');
var pass = require("./Jstillery/src/custom_esmangle_pipeline.js").createPipeline;
var esprima = require('esprima');
var escodegen = require('escodegen');
var esmangle = require('esmangle');
const jsdom = require("jsdom");
// var isEmpty = require('lodash.isempty');
const helper = require('./helper')
var TreeModel = require('tree-model')
const n = recast.types.namedTypes;
const b = recast.types.builders;
const deobfuscatePlugin = require('./babel-plugin-deobfuscate')
const babelCore = require('babel-core')
const prettier = require('prettier')
const commentRemover = require('./commentRemover')
function illuminateformat (code) {
  return prettier.format(code)
    .split('\n')
    .filter(line => line !== '')
    .join('\n')
}
const generatorOpts = { compact: false }

function illuminateDeobfuscate (code) {
  return illuminateformat(babelCore.transform(code, { plugins: [ deobfuscatePlugin ], ast: false, generatorOpts }).code)
}

tree = new TreeModel()
let codeMap = new Map()
let CodeRoot;
let codeTreeID = 0;
let codeCurrentParent;
var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
let codeRecord = []

function RemoveCommnets(code) {
  let newCode = code.replace(`"//"`, `"/"+"/"`)
  .replace(`'//'`, `'/'+'/'`)
  .replace(`'http://`, `'http:/'+'/' + '`)
  .replace(`"http://`, `"http:/"+"/" +"`)
  newCode = commentRemover.stripComments(newCode)
  return newCode
}

function removeUnusedVariables(code) {
  // Need to remove all unused variable declaration
  // console.log("Removing Unused variables with Putout")
  const removedUnused = putout(code, {
    plugins: [
        'remove-unused-variables'
    ]
  });
  return removedUnused.code
}

app.get('/clearHistory', function(req, res, next) {
  CodeRoot = null
  codeTreeID = 0
  codeCurrentParent = null
  res.json({
    success: true,
  });
});

app.post('/dynamic', function(req, res) {
  const { JSDOM } = jsdom
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  let originalCode = req.body.source
  let log = ''
  let reRun = false
  let reRunInstr = [] // 

  const patchDocument = (document) => {
    // here we patch all the native functions in document so when it gets called we can be alerted
    //GET ID
    const defaultGetElementById = document.getElementById.bind(document);
    document.getElementById = function (id) {
      log += `DOM INTERACTION:\ndocument.getElementById('${id}') Called\n`
      const defaultReturn = defaultGetElementById(id)
      if (!defaultReturn) {
        // THIS ELEMENT DOESNT EXIST! NEED TO ADD INTO THE DOM!
        log += `This element doesnt exisit will run the program again with an div id '${id}'\n`
        reRun = true
        reRunInstr.push({  env: 'document',
                          func: 'CreateElemWithID',
                          params: id
                        })
      }
      return defaultReturn
    }
    // TODO Other document functions

    var defaultAddEventListener = dom.window.EventTarget.prototype.addEventListener;
    dom.window.EventTarget.prototype.addEventListener = function _window_addEventListener(event, listener, useCapture) {

      var id = '';
      if (this.id) {
        id = this.id
      }
      log += `DOM INTERACTION:\n`
      log += `Script added event listener for event :(${event}) on element with id '${id}'\n`
      // TODO WRAP THE FUNCTIONS

      // if (typeof listener == "function") {
      //   listener = wrappedListener(event, arguments[1])
      // }
      defaultAddEventListener.apply(window, [event, listener, useCapture])
    }
    return document
  }

// g = document.createElement('div');
// g.setAttribute("id", "Div1");
  const document = patchDocument(dom.window.document)
  const window = dom.window

  const parsereRunInstr = (instr) => {
    console.log("parsereRunInstr")
    console.log(instr)
    switch(instr.env) {
      case "document":
        // THE RERUN INSTRUCTION 
        switch (instr.func){
          case "CreateElemWithID":
            node = document.createElement('div');
            node.setAttribute("id", instr.params);
            document.body.appendChild(node)
            break
          default:

        }
        break
      default:
        return
    }
  }

  try {
    let listener = req.body.listener
    // DO DYNAMIC ANALYSIS STUFF
    // console.log(defaultAddEventListener)
    let stage = new Iroh.Stage(originalCode);
    // create a listener
    if (listener) {
      log += "=======================ADDED LISTENR=======================\n"
      stage.addListener(Iroh.VAR).on("after", (e) => {
        log += "--".repeat(e.indent) + `After declaring Variable:\n`
        log += "--".repeat(e.indent) + `${e.name}=>${helper.formatVariable(e.value)}\n`
      });
  
      stage.addListener(Iroh.ASSIGN).on("fire", (e) => {
        log += "--".repeat(e.indent) + `Assignment Fire\n`
        log += "--".repeat(e.indent) + `${e.object}=>${helper.formatVariable(e.value)}\n`
      });
  
      let funclistener = stage.addListener(Iroh.FUNCTION);
  
      funclistener.on("enter", (e) => {
        log += "--".repeat(e.indent) + `Function ${e.name} called with params ${helper.formatVariable(e.value)}\n`
      });
  
      funclistener.on("return", (e) => {
        log += "--".repeat(e.indent) + `Function ${e.name} Returning ${helper.formatVariable(e.value)}\n`
      });
  
      // stage.addListener(Iroh.UPDATE).on("fire", (e) => {
      //   // this logs the variable's 'name' and 'value'
      //   log += `Update Fire\n`
      //   log += `Prefix${e.prefix} OP:${e.op} = Result${e.result}\n`
      // });
  
      stage.addListener(Iroh.MEMBER).on("fire", (e) => {
        if (e.property.includes('push') || e.property.includes('shift')) {
          return
        }
        log += `Member Fire:\n`
        switch(e.object) {
          case window:
            log += "--".repeat(e.indent) + `Attempted to call the window Object function ${e.property}\n`
            break
          case document:
            log += "--".repeat(e.indent) + `Attempted to call to document.${e.property}\n`
            break
          default:
            log += "--".repeat(e.indent) + `Object: (${e.object}) Prop: [${e.property}]\n`
            break
        }
      });
    }
    
    let cnt = 0
    do {
      cnt++
      if (cnt > 100) {
        break;
      }
      try {
          // There are reRun Instructions from previous runs.
        while(reRunInstr.length > 0){
          parsereRunInstr(reRunInstr.pop())
        }
        log += `=========== Run Number ${cnt}=========\n`

        eval(stage.script);
        reRun = false; // if the whole script executed without any errors no rerun needed
        log += `=========== Finished Run ${cnt} run=========\n`
      } catch (e) {
        console.log(e)
        log += e + '\n'
      }
    }
    while (reRun);

    res.status(200);
    res.json({
      source: originalCode,
      log: "Execution log:\n" + log
    });
  } catch (e) {
    console.log(e);
    res.json({
      error: e
    })
  }
  res.end();
  return;
});


app.post('/undo', function(req, res) {
  try {
    res.status(200);
    res.json({
      source: codeRecord.pop()
    });
  } catch (e) {
    console.log(e);
    res.json({
      error: e
    })
  }
  res.end();
  return;
});

app.post('/save', function(req, res) {
  let newCode = req.body.source
  if (!CodeRoot || !codeCurrentParent) {
    CodeRoot = tree.parse({id: codeTreeID, label:"root"})
    codeMap.set(codeTreeID, newCode)
    codeTreeID++
    codeCurrentParent = CodeRoot
  }
  let treeJson
  if (codeRecord.length > 0) {
    lastCode = codeRecord.pop(newCode)
    if (newCode === lastCode) {
    // if the same no new record added
    codeRecord.pop()
    treeJson = JSON.stringify(CodeRoot.model)
    res.status(200).json({
      success: true,
      codeTree: treeJson,
    });
    res.end();
    return
    }
  }

  const newChild = tree.parse({id: codeTreeID, label: "Saved"})
  codeMap.set(codeTreeID, newCode)
  codeTreeID++
  console.log(codeCurrentParent)
  codeCurrentParent = codeCurrentParent.addChild(newChild)
  treeJson = JSON.stringify(CodeRoot.model)

  res.status(200).json({
    success: true,
    codeTree: treeJson,
  });

  res.end();
  return;
})  

app.post('/pretty', function(req, res) {
  let allDeclaredVariables = []
  let originalCode = req.body.source
  if (!CodeRoot || !codeCurrentParent) {
    CodeRoot = tree.parse({id: codeTreeID, label:"root"})
    codeMap.set(codeTreeID, originalCode)
    codeTreeID++
    codeCurrentParent = CodeRoot
  }
  try {
    codeRecord.push(originalCode)
    code = RemoveCommnets(originalCode)
    // Split all the vars declariation:
    // console.log(code)

    const ast = recast.parse(code)
    // get all function names:
    let functionNames = []
    recast.visit(ast, {
      visitFunctionDeclaration(path) {
        var node = path.node;
        let functionName = node.id.name
        functionNames.push(functionName)
        this.traverse(path);
      },
      visitVariableDeclarator(path) {
        var node = path.node
        allDeclaredVariables.push(node.id.name)
        this.traverse(path);
      },
      visitExpressionStatement(path) {
        let node = path.node
        let expr = node.expression
        if (n.AssignmentExpression.check(expr)) {
          // Check if the left identifier is defined 
          let left  = expr.left
          let right = expr.right
          if (n.Identifier.check(left)) {
            let idenName = left.name
            if (!allDeclaredVariables.includes(idenName)) {
              // this identifier has not been declared before
              // We need to change this expression in to a variable declaration
              node.type = "VariableDeclaration"
              node.end = node.end + 4 // this is to add the var declaration
              node.declarations = [{
                type: "VariableDeclarator",
                id : left,
                init: right
              }]
              node.kind = "var"
              allDeclaredVariables = allDeclaredVariables.filter(x => { x != idenName })
            }     
          }
        }
        this.traverse(path);
      }

    });
    let output = recast.prettyPrint(ast, { tabWidth: 4 }).code;
    // CHECK IF THE PROCESS CAUSE ANY CHANGE
    if (originalCode === output) {
      // if the same no new record added
      codeRecord.pop()
    } else {
      // Theres something new!!
      // update the code tree with the current parent
      const newChild = tree.parse({id: codeTreeID, label: "Prettify"})
      codeMap.set(codeTreeID, output)
      codeTreeID++
      console.log(codeCurrentParent)
      codeCurrentParent = codeCurrentParent.addChild(newChild)
    }
    // console.log(CodeRoot)
    const treeJson = JSON.stringify(CodeRoot.model)


    res.status(200).json({
      source: output,
      codeTree: treeJson,
      codeTreeID: codeTreeID,
      functionNames: functionNames,
    });
  } catch (e) {
    console.log(e)
    return res.json({
      error: e
    })
    // throw(e)
  }
  res.end();
  return
});

app.post('/unused', function(req, res) {
  const originalCode = req.body.source
  if (!CodeRoot) {
    CodeRoot = tree.parse({id: codeTreeID, label:"root"})
    codeMap.set(codeTreeID, originalCode)
    codeTreeID++
    codeCurrentParent = CodeRoot
  }

  try {
    codeRecord.push(originalCode)
    let output = removeUnusedVariables(originalCode)

    if (originalCode === output) {
      // if the same no new record added
      codeRecord.pop()
    } else {
      // Theres something new!!
      // update the code tree with the current parent
      const newChild = tree.parse({id: codeTreeID, label:"unused"})
      codeMap.set(codeTreeID, output)
      codeTreeID++
      codeCurrentParent = codeCurrentParent.addChild(newChild)
    }
    const treeJson = JSON.stringify(CodeRoot.model)

    res.status(200);
    res.json({
      source: output,
      codeTree: treeJson,
      codeTreeID: codeTreeID,
    });
  } catch (e) {
    res.json({
      error: e
    })
  }
  res.end();
  return;
});

app.post('/getNode', function(req, res) {
  let newID = req.body.newId
  let diff = req.body.diff
  if (!diff) {
    codeCurrentParent = CodeRoot.first(function (node) {
      return node.model.id === newID;
    });
  }

  const requestedCode = codeMap.get(newID)
  res.status(200)
  res.json({
    source: requestedCode,
  });
  res.end()
})


app.get('/getHistory', function(req, res, next) {
  console.log("GETTING HISTORY")
  res.status(200)
  let treeJson = '{}'
  if (CodeRoot) {
    treeJson = JSON.stringify(CodeRoot.model)
  }
  res.json({
    codeTree: treeJson,
  });

  res.end()
});


app.post('/constantProp', function(req, res) {
  let originalCode = req.body.source
  let functionNameLitMapping = new Map()
  if (!CodeRoot) {
    CodeRoot = tree.parse({id: codeTreeID, label:"root"})
    codeMap.set(codeTreeID, originalCode)
    codeTreeID++
    codeCurrentParent = CodeRoot
  }
  try {
    codeRecord.push(originalCode)
    // need to get rid of "//"

    // find the functions that used array indexing
    // then call the illuminate for it
    console.log("about use use illuminate")
    let illuminatePropagatedCode = illuminateDeobfuscate(originalCode)
    // let illuminatePropagatedCode = originalCode
    console.log("Finished illuminate")

    illuminatePropagatedCode = illuminatePropagatedCode
    .replace(`"//"`, `"/"+"/"`)
    .replace(`'//'`, `'/'+'/'`)
    .replace(`'http://`, `'http:/'+'/' + '`)
    .replace(`"http://`, `"http:/"+"/" +"`)
    console.log("Esprima prasing...")
    var ast = esprima.parse(illuminatePropagatedCode);
    recast.visit(ast, {
      visitFunctionDeclaration(path) {
        var node = path.node;
        let functionName = node.id.name
        // all functions that simply return a literal inline them
        if (node.body && node.body.body ){
          const functionStatements = node.body.body
          const lastStatement = functionStatements[functionStatements.length - 1]
          if(n.ReturnStatement.check(lastStatement)) {
            // if the function returns on the last statement,
            if (n.Literal.check(lastStatement.argument)) {
              // it returns a literal, now i replace all function calls to this literal
              const literalstmt =  lastStatement.argument
              functionNameLitMapping.set(functionName, literalstmt.value)
            }
          }
        }
        this.traverse(path);
      }
    });
    console.log("Finished marking functionName and literal maping")
    if (functionNameLitMapping.size > 0) {
      // we found some functions that just return a literal
      // now we go through all the calls to functions that has the name in function lit mapping and replace it with a literal

      recast.visit(ast, {
        // check for all call expression

        visitCallExpression(path) {
          let node = path.node
          let callee = node.callee
          if (n.Identifier.check(callee)){
            const calleeName = callee.name
            if (functionNameLitMapping.get(calleeName)) {
              const litVal = functionNameLitMapping.get(calleeName)
              // node replace
              // const literalNode = b.literal(litVal)
              node.type = "Literal"
              delete node.callee
              node.value = litVal
              delete node.arguments
            }
          }
          this.traverse(path);
        },

        visitFunctionDeclaration(path) {
          var node = path.node;
          let functionName = node.id.name
          
          // all functions that simply return a literal inline them
          if (functionNameLitMapping.get(functionName)){
            node = null
            // get rid of this node
          }
          this.traverse(path);
        }

      })
    }

    console.log("Replacing function calls to ust the literals they return")
    try{
      ast = esmangle.optimize(ast, pass(), {
        destructive: true
      });
    }catch(e){
      console.error("[EE] Problem in mangling",e);
      console.error("[II] Mangle normalization were not performed due to errors. the code is going to be passed as it is to JSTillery");
    }
    jstiller.init();
    ast = jstiller.deobfuscate(ast, null, true);
    console.log("Finished JSTillery deobfusacte")

    var output = escodegen.generate(ast, {
      comment: false
    });
    console.log("Generated Output")
    // let output = recast.prettyPrint(ast, { tabWidth: 2 }).code;

    if (originalCode === output) {
      // if the same no new record added
      codeRecord.pop()
    } else {
      // Theres something new!!
      // update the code tree with the current parent
      console.log("The generated output is new!")
      const newChild = tree.parse({id: codeTreeID, label:"Constant"})
      codeMap.set(codeTreeID, output)
      codeTreeID++
      codeCurrentParent = codeCurrentParent.addChild(newChild)
    }

    res.status(200);
    const treeJson = JSON.stringify(CodeRoot.model)

    res.json({
      source: output,
      codeTree: treeJson,
      codeTreeID: codeTreeID,
    });
  } catch (e) {
    console.log(e);
    res.json({
      error: e
    })
  }
  res.end();
  return;
});

app.post('/execute', function(req, res) {
  try {
    // exectionRecord.push(req.body.source)
    let code = req.body.source
    // capture all variable definition and calculate their final state
    let evalRes = eval(code)
    res.status(200);
    res.json({
      res: evalRes,
      // source: allPrettyCode
    });
  } catch (e) {
    console.log(e);
    res.json({
      error: e
    })
  }
  res.end();
  return;
});



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
// app.use('/pretty', prettyRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;