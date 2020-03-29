var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const recast = require("recast");
const putout = require('putout');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var cors = require("cors");
var bodyParser = require('body-parser');
var jstiller = require('./Jstillery/src/jstiller');
var pass = require("./Jstillery/src/custom_esmangle_pipeline.js").createPipeline;
var esprima = require('esprima');
var escodegen = require('escodegen');
var esmangle = require('esmangle');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let codeRecord = []
function RemoveCommnets(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'')
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

app.post('/pretty', function(req, res) {

  try {
    let originalCode = req.body.source
    codeRecord.push(originalCode)
    let code = RemoveCommnets(originalCode)
    // code = removeUnusedVariables(code)
    const ast = recast.parse(code)
    let output = recast.prettyPrint(ast, { tabWidth: 2 }).code;
    // CHECK IF THE PROCESS CAUSE ANY CHANGE
    if (originalCode === output) {
      // if the same no new record added
      codeRecord.pop()
    }

    res.status(200);
    res.json({
      source: output
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

app.post('/unused', function(req, res) {
  try {
    codeRecord.push(req.body.source)
    let changed = removeUnusedVariables(req.body.source)
    if (req.body.source === changed) {
      // if the same no new record added
      codeRecord.pop()
    }

    res.status(200);
    res.json({
      source: changed
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

app.post('/constantProp', function(req, res) {
  try {
    let originalCode = req.body.source
    codeRecord.push(originalCode)
    var ast = esprima.parse(originalCode);
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

    var reduced = escodegen.generate(ast, {
      comment: true
    });

    if (originalCode === reduced) {
      // if the same no new record added
      codeRecord.pop()
    }

    res.status(200);

    res.json({
      source: reduced
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
    // let allCode = exectionRecord.join(';')
    // let allPrettyCode = exectionRecord.join(';\n')
    // console.log("in execute")
    // allCode = exectionRecord.forEach(c => allCode = allCode + ';' + c)


    // capture all variable definition and calculate their final state
    let evalRes = eval(code)
    console.log(evalRes)
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
app.use('/users', usersRouter);
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
