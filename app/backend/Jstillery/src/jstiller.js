/*
  Copyright (C) 2014 Igor null <m1el.2027@gmail.com> for https://github.com/m1el/esdeobfuscate
  
  Copyright (C) 2015 Stefano Di Paola <stefano.dipaola@mindedsecurity.com> for the fork of 
  esdebofuscate to jstiller.js

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
var DEBUGNAME = __filename.slice(__dirname.length + 1, -3);
var debug = require('util').debuglog(DEBUGNAME);
const clonedeep = require('lodash.clonedeep')
const crypto = require('crypto');

var parseAst = require("esprima").parse;
var genCode = require("escodegen").generate;
var vm = require("vm");
var isEqual = require('lodash.isequal');
var b64 = require("./libs/b64");
var natives = require("./native_props").natives
require("./libs/cycle");
var collectHTMLData = require("./libs/htmlParse").collectHTMLData

var USE_PARTIAL = typeof process.env.USE_PARTIAL !== 'undefined' ? process.env.USE_PARTIAL : true;

function renameVarWithNewName(expr, mapping, funcbodyMap) {
  let newMapping = mapping;
  let newMappingBody;
  let changedExpr;
  let newMappingBodyMerge
  let retValArr
  if (!expr) {
    return expr
  }
  switch(expr.type) {
    case 'BlockStatement':
      let newBodyExpr = [];
      expr.body.forEach(ex => {
        retValArr = renameVarWithNewName(ex, newMapping, funcbodyMap);
        changedExpr = retValArr[0]
        newMappingBodyMerge = retValArr[1]
        newBodyExpr.push(changedExpr)
        newMapping = new Map([...newMappingBodyMerge, ...newMapping])
      })
      expr.body = newBodyExpr
      break
    case 'AssignmentExpression':
      retValArr = renameVarWithNewName(expr.left, newMapping, funcbodyMap)
      expr.left = retValArr[0]
      newMapping = retValArr[1]
      retValArr = renameVarWithNewName(expr.right, newMapping, funcbodyMap)
      expr.right = retValArr[0]
      newMapping = retValArr[1]
      break
    case 'Identifier':
      switch(expr.name) {
        case 'ActiveXObject':
          return [expr, newMapping]
      }
      if (funcbodyMap.get(expr.name)) {
        // its a function identifer dont change it
        return expr
      }
      if (newMapping.get(expr.name)) {
        expr.name = newMapping.get(expr.name)
      } else {
        const randID = crypto.randomBytes(20).toString('hex').substring(1, 3);
        const newID = `${expr.name}_${randID}`
        newMapping.set(expr.name, newID)
        expr.name = newID
      }
      break
    case 'VariableDeclaration':
      let newDeclarations = [];
      expr.declarations.forEach(ex => {
        retValArr = renameVarWithNewName(ex, newMapping, funcbodyMap);
        newDeclarations.push(retValArr[0])
        newMappingBodyMerge = retValArr[1]
        newMapping = new Map([...newMappingBodyMerge, ...newMapping])
      })
      expr.declarations = newDeclarations
      break
    case 'ExpressionStatement':
      retValArr = renameVarWithNewName(expr.expression, newMapping, funcbodyMap)
      expr.expression = retValArr[0]
      newMapping = retValArr[1]
      break
    case 'VariableDeclarator':
      retValArr = renameVarWithNewName(expr.id, newMapping, funcbodyMap)
      expr.id = retValArr[0]
      newMapping = retValArr[1]
      retValArr = renameVarWithNewName(expr.init, newMapping, funcbodyMap)
      expr.init = retValArr? retValArr[0]: expr.init
      newMapping = retValArr? retValArr[1]: newMapping
      break
    case 'CallExpression':
      let newArguments = [];
      expr.arguments.forEach(ex => {
        retValArr = renameVarWithNewName(ex, newMapping, funcbodyMap);
        changedExpr = retValArr[0]
        newMappingBodyMerge = retValArr[1]
        newArguments.push(changedExpr)
        newMapping = new Map([...newMappingBodyMerge, ...newMapping])
      })
      expr.arguments = newArguments
      break
    case 'BinaryExpression':
      retValArr = renameVarWithNewName(expr.left, newMapping, funcbodyMap)
      expr.left = retValArr[0]
      newMapping = retValArr[1]
      retValArr = renameVarWithNewName(expr.right, newMapping, funcbodyMap)
      expr.right = retValArr[0]
      newMapping = retValArr[1]
      break
    case 'Ifstatement':
      if (expr.consequent) {
        let newConsequent = [];
        expr.consequent.forEach(ex => {
          retValArr = renameVarWithNewName(ex, newMapping, funcbodyMap);
          changedExpr = retValArr[0]
          newMappingBodyMerge = retValArr[1]
          newConsequent.push(changedExpr)
          newMapping = new Map([...newMappingBodyMerge, ...newMapping])
        })
        expr.consequent = newConsequent
      }
      if (expr.alternate) {
        let newAlternate = [];
        expr.consequent.forEach(ex => {
          retValArr = renameVarWithNewName(ex, newMapping, funcbodyMap);
          changedExpr = retValArr[0]
          newMappingBodyMerge = retValArr[1]
          newAlternate.push(changedExpr)
          newMapping = new Map([...newMappingBodyMerge, ...newMapping])
        })
        expr.alternate = newAlternate
      }
      retValArr = renameVarWithNewName(expr.test, newMapping, funcbodyMap)
      expr.test = retValArr[0]
      newMapping = retValArr[1]
      break
  }

  return [expr, newMapping]
}

function consoleLogExpr(msg) {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: 'console'
        },
        property: {
          type: 'Identifier',
          name: 'log'
        },
      },
      arguments: [{
        type: 'Literal',
        value: msg,
        raw: msg
      }]
    },
  }
}

function removeReturnNode (expr) {
  if (!expr) {
    return expr
  }
  if (expr.type === 'ReturnStatement') {
    let argument = expr.argument
    expr.type = 'ExpressionStatement'
    expr.expression = argument
    delete expr.argument
  }
  // now if its an ifstatement then return 
  if (expr.type === 'IfStatement') {
    expr.consequent = removeReturnNode(expr.consequent)
    expr.alternate = removeReturnNode(expr.alternate)
  }

  if (expr.type === 'BlockStatement') {
    expr.body = expr.body.map(e => removeReturnNode(e))
  }

  if (expr.type === 'TryStatement') {
    expr.block = removeReturnNode(expr.block)
    expr.handler.body = removeReturnNode(expr.handler.body)
  }

  return expr
  
}
function genToStringObj(a) {
  return function() {
    return "[object " + a + "]"
  }
}
function genToStringNativeFun(a) {
  return function() {
    return "function " + a + "() {\n    [native code]\n}"
  }
}

(function initiateEnvironment() {
  btoa = b64.btoa
  btoa.toString = genToStringNativeFun("btoa");
  atob = b64.atob
  atob.toString = genToStringNativeFun("atob");

  document = {
    toString: genToStringObj("Document"),
    "head": {
      textContent: ""
    },
    "body": {
      textContent: "",
      innerHTML: ""
    },
    write: function() {
      this.body.innerHTML += Array.prototype.slice.call(arguments).join("")
    }
  };
  window = {
    toString: genToStringObj("Window"),
    document: document
  };

  window.top = window.content = window.parent = window.self = window;
  window.btoa = btoa;
  window.atob = atob;
})();

var inLoop = 0;
var jstiller = (function() {
  const PARAMS_NAME = '.params';
  const OBJECTS_NAME = '.objects';
  const EXP_THIS_OBJ = '.this'; // Scope[THIS]
  const EXP_MAYBE_EXP_THIS_OBJ = '.maybe_this'; // Set Scope[MaybeThis] is case we have a new scope.
  const CURRENT_OBJ = '.current';
  //const CURRENT_FUN = '.current_fun';
  var global_vars = ["console", "window", "document", "String", "Object", "Array", "eval",
    "Number", "Boolean", "RegExp", "JSON", "escape", "unescape",
    "decodeURIComponent", "encodeURI", "encodeURIComponent",
    "Date", "Error", "EvalError", "Function", "Infinity",
    "Math", "NaN", "RangeError", "ReferenceError",
    "SyntaxError", "TypeError", "URIError", "decodeURI",
    "isFinite", "isNaN", "parseFloat", "parseInt", "undefined", "null",
    "ArrayBuffer", "Buffer", "Float32Array", "Float64Array",
    "Int16Array", "Int32Array", "Int8Array", "Uint16Array",
    "Uint32Array", "Uint8Array", "Uint8ClampedArray",
    "clearImmediate", "clearInterval", "clearTimeout",
    "setImmediate", "setInterval", "setTimeout", "atob", "btoa"
  ];
  // Missing += etc
  var boperators = {
    '+': function(a, b) {
      return a + b;
    },
    '-': function(a, b) {
      return a - b;
    },
    '*': function(a, b) {
      return a * b;
    },
    '**': function(a, b) {
      return a ** b;
    },
    '/': function(a, b) {
      return a / b;
    },
    '||': function(a, b) {
      return a || b;
    },
    '&&': function(a, b) {
      return a && b;
    },
    '|': function(a, b) {
      return a | b;
    },
    '&': function(a, b) {
      return a & b;
    },
    '%': function(a, b) {
      return a % b;
    },
    '^': function(a, b) {
      return a ^ b;
    },
    '<<': function(a, b) {
      return a << b;
    },
    '>>': function(a, b) {
      return a >> b;
    },
    '>>>': function(a, b) {
      return a >>> b;
    },
    '==': function(a, b) {
      return a == b;
    },
    '===': function(a, b) {
      return a === b;
    },
    '!=': function(a, b) {
      return a != b;
    },
    '!==': function(a, b) {
      return a !== b;
    },
    '>=': function(a, b) {
      return a >= b;
    },
    '<=': function(a, b) {
      return a <= b;
    },
    '<': function(a, b) {
      return a < b;
    },
    '>': function(a, b) {
      return a > b;
    },
    // 'in': function(a, b) { return a in b; }, //mm not sure it's so simple..
    '+=': function(a, b) {
      return a + b;
    }
  /** missing -= *= /= ... */
  };
  var uoperators = {
    '!': function(a) {
      return !a;
    },
    '~': function(a) {
      return ~a;
    },
    '+': function(a) {
      return +a;
    },
    '-': function(a) {
      return -a;
    },
    '--': function(a) {
      return --a;
    },
    '++': function(a) {
      return ++a;
    },
    'typeof': function(a) {
      return typeof a;
    }
  };


  /**
  Finds the path proparr of the object represented in propObj AST.
  returns:   {result:FinalProp,isNative:false} if fully resolved
  returns:   {result:LastPropertyResolved,isNative:true,k:latestPropId} if native
  returns:   {result:undefined,isNative:false} if not found
  */
  function findPropFromAST(propObj, proparr) {
    var latest = null;
    var properties;
    var objType = getType(propObj);
    properties = propObj.properties || propObj.elements;
    debug("Searchkey:", propObj, proparr)
    var isArr = objType === "Array"
    try {
      for (var pa_idx = 0, pa_len = proparr.length; pa_idx < pa_len; pa_idx++) {

        if (isArr) {
          if (typeof (proparr[pa_idx] >>> 0) === "number") {
            if (pa_idx === pa_len - 1) { //It's the latest property in the chain
              //Fully Solved!
              return {
                result: properties[pO_idx],
                isNative: false
              };
            } else { //middle of chain 
              //is an Array, we get the actual value
              latest = properties[proparr[pa_idx]]; //Save it
              //Let's get in the next properties:

              if (latest.properties && latest.properties.length !== 0) {
                isArr = false;
                properties = latest.properties;
              }
              //or in case it's an array elements.
              if (latest.elements && latest.elements.length !== 0) {
                isArr = false;
                properties = latest.elements;
              }

            }
          } else if (natives["Array"].indexOf(proparr[pa_idx]) !== -1) {
            return {
              result: latest,
              isNative: true,
              k: pa_idx
            }
          } else { //MMMMM not in 
            break;
          }
          continue;
        }

        for (var pO_idx = 0, pO_len = properties.length; pO_idx < pO_len; pO_idx++) {
          var keyName = null;
          if (isArr && typeof (proparr[pa_idx] >>> 0) === "Number") {
            keyName = proparr[pa_idx]
          } else {
            if (properties[pO_idx].key.type === "Identifier")
              keyName = properties[pO_idx].key.name
            else if (properties[pO_idx].key.type === "Literal")
              keyName = properties[pO_idx].key.value
          }
          if (typeof keyName !== "undefined" && keyName === proparr[pa_idx]) {
            //Found property

            if (pa_idx === pa_len - 1) { //It's the latest property in the chain
              //Fully Solved!
              return {
                result: properties[pO_idx],
                isNative: false
              };
            } else { //It's in the middle of the chain

              latest = properties[pO_idx]; //Save it
              //Let's get in the next properties:

              if (latest.properties && latest.properties.length !== 0) {
                isArr = false;
                properties = latest.properties;
              }
              //or in case it's an array elements.
              if (latest.elements && latest.elements.length !== 0) {
                isArr = false;
                properties = latest.elements;
              }
              break; //jump to the next property to search
            }

          } else if (pO_idx === pO_len - 1) { //End of real properties and was not found
            // could be undef or native.
            var my_ = latest || propObj
            var mytype;
            if (my_.type === 'Property')
              my_ = my_.value;
            switch (my_.type) {
              case "Literal":
                var type = (typeof my_.type.value)
                mytype = type;
              case "ObjectExpression":
                mytype = "object";
              case "ArrayExpression":
                mytype = "array";
            }

            if (natives[getType(my_)] && natives[getType(my_)].indexOf(proparr[pa_idx]) !== -1) {
              debug("IS NATIVE PROPERTY")
              return {
                result: properties[pO_idx],
                isNative: true,
                k: pa_idx
              }
            } else {
              debug("IS UNDEFINED")
              if (pa_idx === pa_len - 1) {
                debug(properties)
                return {
                  result: undefined,
                  last_resolved: my_,
                  isNative: false
                }
              } else {
                // We're in the middle...of something undefined..
                // Usually a VM would throw an exception
                // a={}; a.f.h (Accessing h of undefined)
                // We return 
                throw Error("Should not happen");
              /*return {
                result: undefined,
                isNative: false
              }*/
              }
            }
          }
        }
      }
    } catch (exc) {
      console.error("[EE]", exc, exc.stack, properties[pO_idx], propObj, proparr);
      process.exit(1)
    }

    if (natives[getType(latest || propObj)].indexOf(proparr[pa_idx - 1]) !== -1) {
      debug("IS NATIVE PROPERTY")
      return {
        result: latest ? latest : propObj,
        isNative: true,
        k: pa_idx - 1
      }
    }

    if (latest) {
      debug("latest!")
      return {
        result: latest,
        isNative: false,
        k: pa_idx
      };
    } else if (properties[0]) {
      debug("not Found!!!!!")
      return {
        result: undefined,
        last_resolved: properties[0].parent,
        isNative: false
      };
    } else if (properties.length === 0) {
      return {
        result: undefined,
        last_resolved: latest || propObj,
        isNative: false
      };
    }
    debug("Final ")
    return {
      result: undefined,
      isNative: false
    };
  }
  function findElemFromAST(propObj, proparr, create) {

    debug('findElemFromAST', propObj, proparr)
    try {
      for (var k = 0, l = proparr.length; k < l; k++)
        if (propObj[proparr[k]]) {
          debug("PROPS FOUND!: ", k, proparr[k])
          if (k == l - 1) {
            return propObj[proparr[k]]
          } else {
            if (propObj[proparr[k]].elements.length !== 0)
              propObj = propObj[proparr[k]].elements;
            break;
          }
        } else {
          break;
      }
    } catch (exc) {
      console.error("[EE]", exc);
      process.exit(1)
    }
    if (propObj[0])
      return propObj[0].parent;

    return null;
  }
  /**
   * [solveNode description]
   * @param  {[type]} node  [description]
   * @param  {[type]} scope [description]
   * @return {[type]}       [description]
   */
  /*    function solveNode(node,scope){
        var _type=node.type;

        if(_type ==="Identifier"){
           return findScope(node,scope)
        }else if(_type==="MemberExpression"){
           return resolveMemberExpression(node,scope)
        } 
      }*/
  //AST Type By .type
  //returns String, Number, Object, Array
  function getType(obj) {
    switch (obj.type) {
      case "Literal":
        var type = (typeof obj.value)
        return type.charAt(0).toUpperCase() + type.slice(1);
      case "ObjectExpression":
        return "Object";
      case "ArrayExpression":
        return "Array";
    }
  }

  /**
   * [getObjectPath description]
   * @param  {[type]} _retob [description]
   * @return {[type]}        [description]
   * Data una MemberExpression
  {
          "type": "MemberExpression",
          "computed": false,
          "object": {
            "type": "MemberExpression",
            "computed": false,
            "object": {
              "type": "Identifier",
              "name": "a"
            },
            "property": {
              "type": "Identifier",
              "name": "b"
            }
          },
          "property": {
            "type": "Identifier",
            "name": "c"
          }
        }
   extracts:
  { name: objectName,
   proparr:[arrays],
   isNativeProp
   } <- a.b.c > [name:a,proparr:["b",c"]
   isNativeProp is true if the name was not found
   */
  function getObjectPath(_retob) {
    //Assert _retObj.type==="MemberExpression"
    var _name = _retob.object.type === 'ThisExpression' ? '.this' : _retob.object.name;
    var _proparr = [];
    var isNativeProp = false;
    while (_retob) {
      _name = _retob.type === 'ThisExpression' ? '.this' : _retob.name;
      if (_retob.property &&
        (typeof _retob.property.name !== "undefined" ||
        typeof _retob.property.value != "undefined"))
        _proparr.unshift(_retob.property.name ? _retob.property.name : _retob.property.value)

      if (!_name) { //Is Native
        isNativeProp = true;
        _name = getType(_retob)
      } else if (global_vars.indexOf(_name) !== -1) {
        isNativeProp = true;
      } else {
        isNativeProp = false;
      }
      _retob = _retob.object
    }
    if (!_name) {
      return null;
    }
    return {
      name: _name,
      proparr: _proparr,
      isNativeProp: isNativeProp
    }
  }

  /**
  * [resolveMemberExpression Given a MemberExpression returns if it's resolution to the value]
  * @param  {[type]} astMemberExpr [description]
  * @return {   scope:_tscope,
  *             isNative:true|false,
  *             isGLobal:true|false,
  *             resolved:_lval|false,
  *             proparr:_obj.proparr,
  *             varname:_obj.name}  [description]
  * {resolved:false} se nn trova
  * {resolved:true, isGlobal:true,proparr:theWholePropChain} se e' globale
  * 
  * 
  */
  var global_eq = ["window", "self", "top", "content", "parent"]
  function resolveMemberExpression(astMemberExpr, scope, recurse) {
    var _sval,
      _lval,
      _tscope;

    var _obj = getObjectPath(astMemberExpr);
    var retObj = {}; //{scope,isNative,isGLobal,resolved,proparr,varname }

    debug("POST getObjectPath")
    debug(_obj, "___", astMemberExpr)
    if (_obj)
      while (global_eq.indexOf(_obj.name) !== -1 && _obj.proparr.length > 0) {
        debug("GLOBAL!!!")
        _obj.name = _obj.proparr[0];
        _obj.proparr = _obj.proparr.slice(1);
    }

    if (_obj && _obj.name in scope) { //was it found in scope? 
      debug("In SCOPE!")
      _tscope = findScope(_obj.name, scope);
      _sval = _tscope.value;


      if (scope !== _tscope.scope && scope.closed) {
        debug("CLOSED!")
        scope.closed = false;
      }
      if (!_sval.value){
        return {
          resolved: false,
          scope: false
        };
      }
        
      _lval = astMemberExpr.property; // last one 
      if (_sval.pure_global) {
        return {
          isGLobal: true,
          resolved: true,
          proparr: _obj.proparr
        };
      } else if (_sval.value.type === "Literal") {
        debug("BEWARE! resolveMemberExpression  LITERAL!")
        return {
          resolved: _sval.value,
          scope: _tscope.scope
        }; //????? was return false;
      }
      ;

      debug("V______", (_sval), (_tscope), _obj)
      if (_sval.value.type === 'Identifier') {
        astMemberExpr.object.name = _sval.value.name
        return { resolved: true, value: astMemberExpr, isIdentifier: true }
      }

      if (_sval.value.type === "CallExpression") {
        console.log("The object of the memberexpr is a callexpr")
        // console.log("We need to evaluate it first then")
        // console.log(_sval.value)
        astMemberExpr.object = _sval.value

        return {
          resolved: true,
          value: astMemberExpr,
          callExpr: true 
        }
        // const res = ast_reduce(_sval.value)
        // console.log("THe result is :!!!!")
        // console.log(res)
      }


      if (!_sval.value[CURRENT_OBJ]) {
        //fun()['g'] < something like that
        return {
          resolved: false
        }
      } //It's not a known Obj


      if (_sval.value[CURRENT_OBJ].type === "ObjectExpression" || _sval.value[CURRENT_OBJ].type === "ArrayExpression") {
        _lval = findPropFromAST(_sval.value[CURRENT_OBJ], _obj.proparr);
        debug("Here", _lval)

      // _lval will be
      // returns:   {result:FinalProp,isNative:false} if fully resolved
      // returns:   {result:LastPropertyResolved,isNative:true,k:latestPropId} if native
      // returns:   {result:undefined,isNative:false} if not found
      //_lval = _lval || _sval.value[CURRENT_OBJ];
      } else { // Not from Array , not from Object! what about CCC.KnownProp??
        _lval = {
          result: _sval.value[CURRENT_OBJ],
          isNative: true,
          proparr: _obj.proparr
        };
      }
      // found?
      if (recurse && _lval.result && _lval.result.value.type === 'MemberExpression') {
        _lval = resolveMemberExpression(_lval.result.value, scope, recurse);
        if (_lval.resolved)
          return _lval;
      }
      return {
        scope: _tscope.scope,
        resolved: _lval.result,
        last_resolved: _lval.last_resolved,
        isNative: _lval.isNative,
        proparr: _obj.proparr.splice(_lval.k),
        varname: _obj.name
      };
    } else if (_obj && global_vars.indexOf(_obj.name) !== -1) { //Is a predefined variable?

      debug("In Global_VARS", _obj);
      return {
        scope: scope,
        isGlobal: true,
        resolved: {
          type: "Property",
          key: {
            type: "Identifier",
            name: _obj.proparr.length ? _obj.proparr[_obj.proparr.length - 1] : _obj.name
          },
          value: astMemberExpr
        },
        proparr: _obj.proparr,
        varname: _obj.name
      };
    } else { //not found in any scope. Let's say it's undefined and that scope is not closed
      debug("CLOSED?!", _obj);
      scope.closed = false;
      return {
        resolved: false
      }; //?????? was return false;
    }
  }

  function objCopy(obj) {
    return JSON.parse(JSON.stringify(obj, function(k, v) {
      if (k === "" || k !== "parent") return v;
    }));
  }

  /***
  *Search Key in scope chain.
  returns false if not present in any scope
  else
          {scope,value}1
  */
  function findScope(key, scope) {
    if (!scope || scope.__proto__ === scope) {
      return false;
    }
    if (scope.hasOwnProperty(key)) {
      return {
        scope: scope,
        value: scope[key]
      };
    }
    return findScope(key, scope.__proto__);
  }


  function match(o, pattern) {
    return Object.keys(pattern).every(function(k) {
      if (typeof pattern[k] !== 'object') {
        return o && pattern[k] === o[k];
      } else {
        return o && match(o[k], pattern[k]);
      }
    });
  }

  function mkliteral(value, raw) {
    if (value instanceof RegExp) {
      return {
        type: 'Literal',
        value: value,
        raw: raw
      };
    }
    if (value === undefined) {
      return {
        type: 'Identifier',
        name: 'undefined',
        pure: true,
        value: value
      };
    }
    if (value === null) {
      return {
        type: 'Identifier',
        name: 'null',
        pure: true,
        value: value
      };
    }
    if (typeof value === 'number' && isNaN(value)) {
      return {
        type: 'Identifier',
        name: 'NaN',
        pure: true,
        value: value
      };
    }
    if (value === Infinity) {
      return {
        type: 'Identifier',
        name: 'Infinity',
        pure: true,
        value: value
      };
    }
    if (value < 0) {
      return {
        type: 'UnaryExpression',
        operator: '-',
        value: value,
        pure: true,
        argument: {
          type: 'Literal',
          pure: true,
          value: -value,
          raw: JSON.stringify(-value)
        }
      }
    }
    if (typeof (value) === "object" && value.type) {
      return value;
    }
    return {
      type: 'Literal',
      pure: true,
      value: value,
      raw: JSON.stringify(value)
    };
  }
  /**
   * Tries toString method called by + and by explicit calls to join or 
   * toString
   * [toString reproduce the toString casting from the AST]
   * @param  {[ast node]} n the node
   * @return {[string]}     a toString representation
   */
  function toString(n, concatStr, sep) {
    var str = concatStr || "";
    sep = sep || ",";
    if (n.type === "ObjectExpression")
      return str + "[object Object]"
    if (n.type === "ArrayExpression") {
      for (var i = 0, el, elV = '', l = n.elements.length; i < l; i++) {
        el = n.elements[i];
        if (el !== "ObjectExpression")
          elV += toString(el, str, sep)
        else
          elV += "[object Object]";
        if (i < l - 1)
          elV += sep
      }
      return str + elV;
    }
    if (n.type === "FunctionExpression")
      return genCode(n);

    if (n.type === "Literal")
      return n.value;

    if (n.type === "Identifier" && (n.name === "Infinity" || n.name === "undefined" || n.name === "null" || n.name === "NaN")){
      return n.name;
    }
    if (n.type === "Identifier") { // is a global standard object/funct
      if (global_vars.indexOf(n.name) !== -1)
        return global[n.name].toString();
      if (Object.keys(window).indexOf(n.name) !== -1)
        return window[n.name].toString();
    }
    //Scope {value:ObjRef, pure:true|false, pure_global:true|false}
    if (n.type === "Identifier" && gscope[n.name]) { // is a Global identifier
      if (gscope[n.name].pure || gscope[n.name].pure_global)
        return toString(gscope[n.name].value, str, sep)
    }

    if (n.type === "MemberExpression") {
      // 'ss'[a=1] -> 'ss'[1] 
      if (n.property.type === "AssignmentExpression") {
        if (n.property.right.type === 'Literal') {
          return n.object.value[n.property.right.value] + '';
        }
      } else if (n.property.type === "Identifier") {
        if (n.object.type === "ArrayExpression") {
          if ([][n.property.name]) {
            return [][n.property.name].toString()
          }
        } else if (n.object.type === "Literal") {
          if (n.object.value[n.property.name]) {
            return n.object.value[n.property.name].toString()
          } else { // returns undefined as string 
            return "undefined";
          }
        } else if (n.object.type === "Identifier" && global_vars.indexOf(n.object.name) !== -1) {
          if (global[n.object.name][n.property.name]) {
            return global[n.object.name][n.property.name].toString()
          }
        }

      }
      ;
    }

    throw "Non stringable";
  }

  function arJoin(n, sep) {
    return toString(n, "", sep);
  }

  function getValue(e) {
    return typeof e.value !== "undefined" ? e.value : e.regex ? new RegExp(e.regex.pattern,e.regex.flags) : (e.retVal ? e.retVal.value : null);
  }

  //var incall=false  Added for knowing when we are in a calling state or declarative.
  let taintedScope;
  var gscope = {} //Added for separating global from local.
  var scopes = [gscope];
  let funcBodyMap = new Map()
  let funcScope = {}
  var global_this = {
    "type": "Identifier",
    "name": "window"
  };
  function init() {
    gscope = {};
   // global_vars.forEach(function (el){ gscope[el] = {value:{type: 'Identifier', name:el, native_type: this[el]?typeof this[el]:"object"} }});
    gscope.externalRefs = [];
    scope_set_this(gscope, global_this)
    // gscope[EXP_MAYBE_EXP_THIS_OBJ] = gscope[EXP_THIS_OBJ] = global_this;
    scopes = [gscope];
  }

  function scope_set_maybe_this(scope, v) {
    debug("scope_set_maybe_this");
    scope[EXP_MAYBE_EXP_THIS_OBJ] = v;
  }
  function scope_set_this(scope, v) {
    scope[EXP_THIS_OBJ] = {
      value: v.value || v
    };
  }
  function set_scope(scope, key, obj) {
    scope[key] = obj;
  }

  function ast_reduce(ast, scope, expandvars, parent) {
    if (!ast) {
      return ast;
    }
    debug("TYPE:", ast.type);

    scope = scope || gscope;

    scope_set_this(scope, scope.__proto__[EXP_MAYBE_EXP_THIS_OBJ] || scope[EXP_THIS_OBJ]);

    var mypar = parent;


    //ast.__parent__=parent;
    var ast_reduce_scoped = function(e, forcedExpand=false) {
      let reduceScope = scope;
      // merge the tainted scope with the current scope
      if (taintedScope) {
        Object.keys(taintedScope).map(p => {
          if (scope[p]){
            reduceScope[p].changed = taintedScope[p].changed
          }
        })
      }
      return ast_reduce(e, reduceScope, forcedExpand, ast);
    };
    // if(ast.called && ast.called_with_args){
    //   debugger;
    //   ast.called_with_args.map(ast_reduce_scoped);
    // }
    var ret, // astnode used to create returning clean node
      left,
      right,
      arg,
      value,
      fscope, // function scope
      last,
      pure,
      leftV,
      rightV,
      valScope,
      valFromScope;
    switch (ast.type) {

      case 'LogicalExpression':

      case 'BinaryExpression':
        var undefObj = {
          "type": "Identifier",
          "name": "undefined",
          pure: true,
          value: undefined
        };
        let Binbody = []

        left = ast_reduce_scoped(ast.left, true);
        right = ast_reduce_scoped(ast.right, true);
        if (left.body) {
          left.body.forEach(e => {Binbody.push(e)})
        }

        if (left.type === 'CallExpression' && left.callee && left.callee.body) {
          if (left.callee.body.body) {
            left.callee.body.body.forEach(e => {Binbody.push(e)})
          } else {
            left.callee.body.forEach(e => {Binbody.push(e)})
          }          
        }

        if (right.type === 'CallExpression' && right.callee && right.callee.body) {
          if (right.callee.body.body) {
            right.callee.body.body.forEach(e => {Binbody.push(e)})
          } else {
            right.callee.body.forEach(e => {Binbody.push(e)})
          }          
        }


        if (right.body) {
          right.body.forEach(e => {Binbody.push(e)})
        }

        let leftPure = left.pure || left.purearg || left.canPure || (left.retVal && left.retVal.pure)
        let rightPure = right.pure || right.purearg || right.canPure|| (right.retVal && right.retVal.pure)
        let binPure = leftPure & rightPure
        if (!right) {
          debug("NO RIGHT!!");
          process.exit(1);
        }
        if (!left) {
          debug("NO LEFT!!");
          process.exit(1);
        }

        if (left.pure && right.pure && ast.operator in boperators) {
          value = mkliteral(boperators[ast.operator](left.value, right.value))
          value.body = Binbody
          return value;
        } else if ( binPure && ast.operator in boperators) {
          // it can be evaluted BUT DONT REDUCE!
          let leftVal = left.value
          if (left.retVal && left.retVal.pure) {
            leftVal = left.retVal
          }
          
          let rightVal = right.value
          if (right.retVal && right.retVal.pure) {
            rightVal = right.retVal
          }

          if (rightVal && leftVal) {
            value = mkliteral(boperators[ast.operator](leftVal, rightVal))
            return {
              type: ast.type,
              operator: ast.operator,
              left: left ? left : ast.left,
              right: right ? right : ast.right,
              canPure: binPure,
              retVal: value,
              body: Binbody
            };
          }
          // well either left or right is not pure
          if (left.pure) {
            leftVal = left
          }
          if (right.pure) {
            rightVal = right
          }
          return {
            type: ast.type,
            operator: ast.operator,
            left: leftVal ? leftVal : left,
            right: rightVal ? rightVal : right,
            canPure: false,
            body: Binbody
          };
          
        } else {
          if (parent.type !== "ForStatement") { //nested Expr
            if (left.retVal && left.retVal.pure)
              left = left.retVal
            if (right.retVal && right.retVal.pure)
              right = right.retVal;
          }
          // 
          // Concatenation of different types that results in Strings
          // BEWARE: the toString is considered not overrided
          // XXXXXXXXXXXXXXXXX
          // TODO ArrayExpression.join!
          // Also functions need 2 b rewritten (toString)
          var typeOps = ["ObjectExpression", "ArrayExpression", "Literal", "Identifier", "MemberExpression"]
          if (ast.operator === '+' /*&& typeOps.indexOf(left.type)!==-1 &&
                  typeOps.indexOf(right.type)!==-1*/ ) { // []|{}|String|undefined
            try {
              //  if((right.type==="Identifier" && (right.name!=="undefined" || right.name!=="null") ) &&
              //    (left.type==="Identifier" && (left.name!=="undefined" || left.name!="null") ) )
              // {
              //     return {
              //     type: ast.type,
              //     operator: ast.operator,
              //     left: left,
              //     right: right
              // };
              // }

              //////////////////////////////////////////////////////////////
              var undefOrObj = right; //right undefObj;
              if (right.type === "Identifier") {
                if (right.name in scope) {
                  debug("IN SCOPE", scope)
                  rightV = findScope(right.name, scope).value;
                  if (rightV.changed) {
                    return ast
                  }
                  right = rightV.value;
                } else if (global_vars.indexOf(right.name) === -1) {
                  debug("IN GLOBAL")
                  rightV = {
                    value: undefOrObj
                  };
                  right = rightV.value;
                }
              }
              //var _tarV=ret.callee.object.elements.map(function(a){return genCode(a,{format:{json:true}})})
              if (right.type === "MemberExpression") {
                rightV = resolveMemberExpression(right, scope);
                debug("Right Member resolved ", (rightV.resolved))
                if (rightV.resolved && rightV.scope === scope) {
                  if (rightV.resolved.type === "Property") {
                    rightV = toString(rightV.resolved.value)
                  } else {
                    if (!rightV.resolved.value && rightV.isNative) {

                      rightV = toString(undefOrObj);
                    } else {
                      rightV = toString(rightV.resolved.value)
                    }
                  }
                // rightV=toString(rightV.resolved.value)
                } else { //Not found, lets expand it to undefined 

                  if (right.property.name === "constructor" || (!scope.closed && scope !== gscope))
                    // if we're in a !expandVars situation we should'n expand undefined values
                    rightV = toString(undefOrObj);
                  else if(!getObjectPath(undefOrObj)){ 
                  // if cannot get Object path means that it's probably not stringable
                  // like aa().test+'bb'
                    rightV = toString(undefOrObj);
                  } else {
                    rightV = toString(undefObj);
                    // rightV=toString({type: "Identifier",
                    //                    "name": "undefined"
                    //                  });
                  }
                }
              } else if (right.type !== "ObjectExpression")
                rightV = toString(right);
              else
                rightV = "[object Object]";
              ////////////////////////////////////////////////////////////// 
              undefOrObj = left; //left undefObj
              if (left.type === "Identifier") {
                if (left.name in scope) {
                  leftV = findScope(left.name, scope).value;
                  if (leftV.changed) {
                    return ast
                  }
                  left = leftV.value;
                } else if (global_vars.indexOf(left.name) === -1) { //Not found, lets expand it to undefined 
                  leftV = {
                    value: undefOrObj
                  };
                  left = leftV.value;
                }
              }
              if (left.type === "MemberExpression") {
                //leftV=toString(left);
                leftV = resolveMemberExpression(left, scope);
                debug("Lft Member resolved ", leftV, left)
                if (leftV.resolved && leftV.scope === scope) {
                  if (leftV.resolved.type === "Property") {
                    leftV = toString(leftV.resolved.value);
                  } else {
                    if (!leftV.resolved.value) {
                      leftV = toString(undefOrObj);
                    } else {
                      leftV = toString(leftV.resolved.value)
                    }
                  }
                } else {
                  if (left.property.name === "constructor" || (!scope.closed && scope !== gscope))
                    leftV = toString(undefOrObj);
                  else if(!getObjectPath(undefOrObj)){ 
                  // if cannot get Object path means that it's probably not stringable
                  // like aa().test+'bb'
                    leftV = toString(undefOrObj);
                  } else {
                    leftV = toString(undefObj);
                  }
                }
              } else if (left.type !== "ObjectExpression")
                leftV = toString(left);
              else
                leftV = "[object Object]"


              value = leftV + rightV
              value = mkliteral(value);
              value.body = Binbody

              return (value)
            } catch (exc) { // thrown by toString() if it's not stringable
              debug("CATCH!", exc.stack)
              return {
                type: ast.type,
                operator: ast.operator,
                left: left ? left : ast.left,
                right: right ? right : ast.right,
                canPure: binPure,
                body: Binbody
              };
            }
          }
          return {
            type: ast.type,
            operator: ast.operator,
            left: left,
            right: right,
            canPure: binPure,
            body: Binbody
          };
        }

      case 'UnaryExpression':

        arg = ast_reduce_scoped(ast.argument);
        let unBody = []
        if (arg.body) {
          arg.body.forEach(e => unBody.push(e))
        }

        if (arg.pure && ast.operator in uoperators) {
          debug("UnaryExpression", ast)
          value = mkliteral(uoperators[ast.operator](arg.value))
          value.body = unBody
          return value;
        } else {
          if (arg.type === "Identifier") { //In case it hasn't been expanded we try again.
            value = findScope(arg.name, scope);
            if (value && value.value && value.value.value)
              arg = value.value.value;
            else if(arg.native_type || global_vars.indexOf(arg.name) !== -1)
              arg.native_type = this[arg.name]?typeof this[arg.name] :"object";
          }
          var typeOps = ["ObjectExpression", "ArrayExpression", "Literal","FunctionExpression"];
          var typeOfOps = ["object","function"];
          
          if (typeOps.indexOf(arg.type) !== -1 || typeOfOps.indexOf(arg.native_type) !== -1) { // []|{}|String
            //var _tarV=ret.callee.object.elements.map(function(a){return genCode(a,{format:{json:true}})})
            if (arg.type === "ArrayExpression") {
              try {
                value = JSON.parse(genCode(arg));
              } catch (exc) {
                value = arg.elements.map(function(a) {
                  if (a.value) return a.value;
                  return "XX"
                })
              }
            } else if (arg.type === "ObjectExpression" || arg.native_type === 'object')
              value = {};
            else if (arg.type === "FunctionExpression" || arg.native_type === 'function'){
              value = function (){};
            } else{
              value = undefined; //we can force to undefined as the "pure" operation are already taken above
            }

            if (ast.operator === "+") {
              value = +value;
            } else if (ast.operator === "~") {
              value = ~value;
            } else if (ast.operator === "!") {
              value = !value;
            } else if (ast.operator === "-") {
              value = -value;
            } else {
              return {
                type: ast.type,
                operator: ast.operator,
                argument: arg,
                prefix: ast.prefix,
                body: unBody
              }
            }

            value = mkliteral(value);
            value.body = unBody
            return value
          }
          return {
            type: ast.type,
            operator: ast.operator,
            argument: arg,
            prefix: ast.prefix,
            body: unBody
          };
        }

      case 'Program':
        ret = {
          type: ast.type,
        };
        ast.body.forEach(exp => {
          if (exp.type === 'FunctionDeclaration') {
            let funcID = exp.id.name
            funcBodyMap.set(funcID, exp)
          }
        })

        let bodyReduced = ast.body.map(ast_reduce_scoped)
        let progBody = []
        bodyReduced.forEach(expr => {
          if (expr.type === "BinaryExpression" && expr.body) {
            expr.body.forEach(ex => {progBody.push(ex)})
          }
          if (expr.type === 'WhileStatement' && expr.inlineBody) {
            expr.inlineBody.forEach(ex => {progBody.push(ex)})
          }
          if (expr.type === 'Literal' && expr.body) {
            expr.body.forEach(ex => {progBody.push(ex)})
          }
          if (expr.type === 'VariableDeclaration' && expr.declarations &&
          expr.declarations[0].eval) {
            let varDeclarator = expr.declarations[0]
            varDeclarator.body.forEach(ex => {progBody.push(ex)})
            progBody.push(expr)
          }
          if (expr.type === 'ExpressionStatement') {
            // call expression can reduce to body of the function call
            if (expr.expression.body) {
              expr.expression.body.forEach(ex => {progBody.push(ex)})
            }
          }
          progBody.push(expr)

        })

        // need to remove all the return statements
        progBody = progBody.map(e => removeReturnNode(e))

        ret.body = progBody
        return ret;

      case 'ExpressionStatement':
        if(ast.expression.type === 'ConditionalExpression'){
          ast.expression.canbetransformed = true;
        }
        let exprReduced =  ast_reduce_scoped(ast.expression)
        if (exprReduced.type === 'BlockStatement') {
          return {
            type: exprReduced.type,
            body: exprReduced.body
          }
        }
        ret = {
          type: ast.type,
          expression: exprReduced
        };
        ret.pure = ret.expression.pure;
        if (ret.expression.expanded) //if expanded property is set to true when we expand Function or eval
          return ast_reduce_scoped(ret.expression)
        
        /// Transforms SequenceExpression a,b,c to BlockStatement a;b;c; but only if it is standalone (Ie not in another expression)
        /*
        c=3;
        test,v=4,h=4;
        -->
        c = 3;
        test;
        v = 4;
        h = 4;
        */
        if(ret.expression.type === 'SequenceExpression' && (parent.type === 'BlockStatement' || parent.type === 'Program')){
          _tmp = ret.expression.expressions.map(el => {return {type:'ExpressionStatement',expression: el}})
          ret = {
            type: 'Program', // This is a hack because we need to return a ast node, and we actually have n nodes in a block.
                            // so instead of using BlockStatement, which would be rewritten as {.expressions..}, we use Program 
                            // expressions are not surrounded by brackets.
            body: _tmp
          };
          parent.body[parent.body.indexOf(ast.expression)] = ret;
          //parent.body.splice.apply(parent.body,[parent.body.indexOf(ast.expression),1].concat(_tmp));
          return ret;
        }

        return ret;

      case 'ArrayPattern': //ADDED
        if (ast.elements.length) {
          ast.elements = ast.elements.map(function(el) {
            el = ast_reduce(el, scope, false, ast)
            return el;
          });
        }
        return ast;

      case 'AssignmentExpression':
        ret = {
          type: ast.type,
          operator: ast.operator,
          left: ast_reduce(ast.left, scope, false, ast),
          right: ast_reduce_scoped(ast.right)
        };
        debug("OPERATION: AssignmentExpression", parent, (ret))
        // console.log("OPERATION: AssignmentExpression", parent, (ret))
        if (ret.right.body) {
          ret.body = ret.right.body
        }
        // Checks if assignment is on a variable belonging to an outer scope
        if (scope !== gscope && !scope.closed) {
          if (ret.left.type === 'MemberExpression') {
            _tmp = resolveMemberExpression(ret.left, scope);
            if (_tmp.scope !== scope)
              scope.externalWrite = true;

          } else if (ret.left.type === 'Identifier') {
            _tmp = findScope(ret.left.name, scope);
            if (((_tmp && _tmp.scope !== scope) /*|| !_tmp not found*/ ) && scope.externalRefs.indexOf(ret.left) !== -1){
              scope.externalWrite = true;              
            }
          }
        }
        // *= += etc compound assignment
        if (ast.operator && ast.operator != "=" && !inLoop) {
          // boperators[ast.operator](scope[ret.left.name].value,ret.left)
          ret.right = ast_reduce_scoped({
            type: "BinaryExpression",
            operator: ast.operator[0],
            left: ret.left,
            right: ret.right
          });
          ret.operator = "=";
        }
        /*
          AssignmentExpression: g=0 
          VariableDeclarator: init:{} <. var t=0
          when we have VariableDeclarator we already know the scope.
          with Assigment we need to get the scope.
         */
        // shortcut to resolve of the identifier 
        if (ret.right.type === "Identifier"
          && ret.right.retVal
          && ret.right.retVal.isLocal) {
          ret.right = ret.right.retVal;
        }

        var _trv = ret.right;
        // nested stuff.
        if (ret.right.type === "Literal") {
          ret.retVal = ret.right;
        } else if (ret.right.retVal && (expandvars || ret.right.retVal.isLocal)) {
          _trv = ret.retVal = ret.right.retVal
        } else if (ret.right.type === 'MemberExpression') {
          _tmp = resolveMemberExpression(_trv, scope, true); //recurse to find it refers to a function
          if (_tmp.resolved && _tmp.resolved.value && _tmp.resolved.value.type === 'FunctionExpression')
            _trv = _tmp.resolved.value;
          if (_tmp.last_resolved && expandvars) { //TODO: Temporality
            _trv = mkliteral({
              type: "Identifier",
              name: "undefined"
            });
            ret.right = _trv;
          }
        }

        if (ret.left.type === "ArrayPattern") {
          if (_trv.type === 'Literal' || _trv.type === 'ArrayExpression') {
            ret.left.elements.forEach(function(el, id) {
              if (el != null) {
                var _el = el.type === 'AssignmentPattern' ? el.left : el;
                var value = _trv.type === 'ArrayExpression' ? _trv.elements[id] : mkliteral(_trv.value[id]);
                ast_reduce_scoped({
                  type: 'AssignmentExpression',
                  left: _el,
                  operator: '=',
                  right: value
                });
              }
            });
          }
        }
        // Scope Finding 
        valFromScope = false;
        //if left is Ident and is found in any scope update it with the new rval
        if (ret.left.type === "Identifier") {
          if (ret.left.name in scope) {
            valFromScope = findScope(ret.left.name, scope);
            valScope = valFromScope.scope;
            valFromScope = valFromScope.value;
          }
        } else if (ret.left.type === "MemberExpression") {
          // var ff={.*};ff.t=4;
          var _tmp;
          _tmp = resolveMemberExpression(ret.left, scope);

          if (_tmp.scope !== scope || (!_tmp.resolved && !_tmp.last_resolved)) {
            //debug("Exiting!", (_tmp.resolved), "___", (_tmp.last_resolved))
            return ret;
          }

          valFromScope = _tmp.scope.value;
          valScope = _tmp.scope.scope;
          var _lval = _tmp.resolved || _tmp.last_resolved;
          var proparr = _tmp.proparr;

          if (_lval.type === "Property") {
            _lval.value = _trv;
            debug("Found!!", _lval.value)
          } else {
            try {
              _lval.properties.push({
                type: "Property",
                key: {
                  type: "Identifier",
                  name: proparr[proparr.length - 1]
                },
                value: _trv
              });
              debug("Not Found!!Adding", _lval.properties);
            } catch (exc) {
              console.log(exc, ret.left);
              console.log((_tmp));
              console.log((_lval), ret);
              process.exit(1)
            }
          }
        }

        //  AssignmentExpression
        if (valScope) { // Found! it's already declared
          debug((valScope), valFromScope);
          // console.log((valScope), valFromScope);

          if (!valScope[OBJECTS_NAME]) {
            valScope[OBJECTS_NAME] = [];
          }
          if (ret.right.type === 'ObjectExpression'
            && valScope[OBJECTS_NAME].indexOf(ret.right) === -1) {
            valScope[OBJECTS_NAME].push(ret.right);
          }

          debug((valScope[OBJECTS_NAME]))
        } else { //not found! it has to be declared!
          valScope = gscope
        }

        if (valScope != scope)
          return ret;

        if (_trv.type === "MemberExpression") {
          var _tmp = resolveMemberExpression(_trv, scope);
          if (_tmp && _tmp.resolved && _tmp.resolved.value) {
            _trv = _tmp.resolved.value
            ret.right = _trv
          }
        }

        if (ret.left.type === 'Identifier') {
          if (valFromScope) {
            debug("Identifier and in Scope", ret, parent)
            // Set the variable to be changed so when next time its used, dont propagate the constnat.
            if (ret.retVal) {
              valFromScope.value = ret.retVal;
              valFromScope.pure = _trv.type === "Literal" ? true : false;
            }

            if (ret.left.name in gscope) {
              if (_trv.type === "Literal")
                gscope[ret.left.name].value = _trv;
              else if (_trv.type === "Identifier" &&
                global_vars.indexOf(_trv.name) !== -1) {
                gscope[ret.left.name].value = _trv;
              } else if (ret.retVal) {
                gscope[ret.left.name].value = ret.retVal;
              }
            }

            if (ret.left.name in scope) {
              scope[ret.left.name].value = _trv
            }

          } else { // In no scope->then it's global.
            debug("Identifier and Not in Scope!", ret.right, _trv)
            if (!(ret.left.name in gscope)) // (when we have xx='ddd' with no previous var xx;)
              gscope[ret.left.name] = {};
            if (_trv.type === "Literal" || _trv.type === "UnaryExpression") {
              gscope[ret.left.name].value = _trv.value;
              gscope[ret.left.name].pure = true;
              debug("Literal", gscope[ret.left.name], ret.right._trv)
            } else if (_trv.type === "Identifier" &&
              global_vars.indexOf(_trv.name) !== -1) {
              debug("Identifier")
              gscope[ret.left.name].value = _trv;
              gscope[ret.left.name].pure_global = true;

            } else if (ret.right.type === "AssignmentExpression") {
              //case multiple assignments: f=g=h=0;

              var r = ret.right
              while (r.right) {
                if (r.right.type === "Literal") {
                  gscope[ret.left.name].value = r.right.value;
                  gscope[ret.left.name].pure = true;
                } else if (r.right.type === "Identifier" && global_vars.indexOf(r.right.name) !== -1) {
                  gscope[ret.left.name].value = r.right;
                  gscope[ret.left.name].pure_global = true;
                }
                r = r.right
              }
            } else if (ret.right.type === "ObjectExpression") {
              if (!gscope[OBJECTS_NAME])
                gscope[OBJECTS_NAME] = [];
              ret.right[CURRENT_OBJ] = objCopy(ret.right);
              gscope[OBJECTS_NAME].push(ret.right);
              gscope[ret.left.name] = {
                value: ret.right,
                pure: false
              }
            } else {
              gscope[ret.left.name].value = _trv;
              gscope[ret.left.name].pure_global = true;
              gscope[ret.left.name].pure = false;
            }
            debug("updated global scope", gscope);
          }
        }
        return ret;

      case 'CallExpression':
        ret = {
          type: 'CallExpression',
          arguments: ast.arguments,
          callee: ast.callee
        };
        var realCallee = ast.callee
        if (ast.callee.type === 'SequenceExpression') {
          // is a comma separated sequence, we need to reduce everything
          // but last one then reduce the arguments, then 
          // the supposed function that will be called
          _tmp = {
            type: 'SequenceExpression',
            expressions: ast.callee.expressions.map(e => ast_reduce_scoped(e, true))
          }
          //ret.callee = ast.callee.expressions.slice(-1);
          var realCallee = _tmp.expressions.slice(-1)[0];
        }

        realCallee.called = true;

        var c_arguments = ast.arguments? ast.arguments.map(a => ast_reduce_scoped(a, true)) : [];
        realCallee.called_with_args = c_arguments;
        ret.arguments = c_arguments;
        /*ret = {
          type: 'CallExpression',
          arguments: c_arguments,
          callee: ast_reduce_scoped(ast.callee)
        };*/
        if (!_tmp)
          ret.callee = realCallee = ast_reduce_scoped(realCallee);
        realCallee.called = true;
        if (_tmp) {
          _tmp.expressions[_tmp.expressions.length - 1] = realCallee;
          ret.callee = _tmp;
        }

        ret.purearg = ret.arguments.every(function(e) {
          //solve 
          if (e.type === 'Identifier' && e.name in scope) {
            valScope = findScope(e.name, scope);
            return valScope && valScope.value && valScope.value.value && valScope.value.value.pure;
          }
          return e.pure || e.simpleType || e.type === 'ObjectExpression';
        });

        if (realCallee.type === 'FunctionExpression' && realCallee.body) {

          realCallee.params.map(function(p, i) {

            realCallee.body.scope[p.name] = {
              value: c_arguments[i] || undefined,
              pure: false
            };
            if (!realCallee.body.scope[PARAMS_NAME])
              realCallee.body.scope[PARAMS_NAME] = {}
            realCallee.body.scope[PARAMS_NAME][p.name] = {
              value: c_arguments[i] || undefined,
              pure: false
            };
          });

          realCallee.callable = (realCallee.body.scope.closed
            || !realCallee.body.scope.externalWrite)
            && realCallee.body
            && realCallee.body.body
            && realCallee.body.body.length > 0
            && realCallee.body.body[realCallee.body.body.length - 1].type === "ReturnStatement";
        }
        if (realCallee.type === "MemberExpression") {
          value = resolveMemberExpression(realCallee, scope, true);
          if (value.resolved) {
            if (value.isGlobal && value.proparr.length === 0) {
              value = value.resolved;
              ret.callee = realCallee = value.key;
              if (_tmp) {
                _tmp.expressions[_tmp.expressions.length - 1] = realCallee;
                ret.callee = _tmp;
              }
            } else if (value.callExpr && value.value)  {
              console.log("The memberExpression callee is an Call expr replaced")
              ret.callee = value.value
              realCallee = value.value;
            } else if (value.isIdentifier && value.value)  {
              console.log("The memberExpression callee is an identifier replaced")
              ret.callee = value.value
              realCallee = value.value;
            } else if (value.resolved.type === "Property") {
              value = value.resolved;

              if (value.value.body) {
                realCallee.resolve_to = value.value;
                realCallee.body = value.value.body;
                realCallee.callable = realCallee.body.scope.closed &&
                  realCallee.body.body &&
                  realCallee.body.body.length > 0 &&
                  realCallee.body.body[realCallee.body.body.length - 1].type === "ReturnStatement";

              } else {
                ret.callee = realCallee = value.value;
                if (_tmp) {
                  _tmp.expressions[_tmp.expressions.length - 1] = realCallee;
                  ret.callee = _tmp;
                }
              }
            }
          }
        }
        if (realCallee.type === "Identifier" && realCallee.name in scope) {
          //Look for declared function and see if the scope is closed.

          valScope = findScope(realCallee.name, scope);
          if (valScope && valScope.value.value) {
            valFromScope = valScope.value.value;
            valScope = valScope.scope;

            if (valFromScope.body && valFromScope.body.scope && (valFromScope.body.scope.closed || !valFromScope.body.scope.externalWrite)) {
              realCallee.body = valFromScope.body;
              realCallee.callable = true;
              realCallee.resolve_to = valFromScope

            } else if (valFromScope.type === 'MemberExpression' || valFromScope.type === 'Identifier' ) {
              ret.callee = realCallee = valFromScope;
              if (_tmp) {
                _tmp.expressions[_tmp.expressions.length - 1] = realCallee;
                ret.callee = _tmp;
              }
            }
          }
        }
        if (match(realCallee, {
            type: 'Identifier',
            name: 'Function'
          }) && ret.purearg) {

          value = ret.arguments;
          debug("Function", value);

          var _tast,
            _params = [],
            _fbody,
            _functionast /*,_preamble='function anonymous('*/ ;
          /*if(value.length===0)
             return ret;
           _fbody=value.pop().value;*/
          _fbody = value.pop();
          if (!_fbody || _fbody.value.trim() === "")
            return ret;
          _fbody = _fbody.value;
          if (value.length > 0) {
            _params = value.map(function(a) {
              /*_preamble+=a.value+',' ;*/
              return {
                type: "Identifier",
                name: a.value
              }
            })
          //_preamble=_preamble.slice(0,-1) ;
          }
          // _preamble='('+_preamble+'){'+ _fbody+'})';
          //s_tast=parseAst(_preamble);
          _tast = parseAst(_fbody, {
            tolerant: true
          });
          _functionast = ast_reduce(_tast, null, true, ast);
          debug("Function _ Finished", _functionast);
          ret = {
            "type": "FunctionExpression",
            "id": {
              "type": "Identifier",
              "name": "anonymous"
            },
            "body": {
              "type": "BlockStatement",
              "body": _functionast.body
            },
            "params": _params,
            "defaults": [],
            "pure": false,
            "expanded": true
          }
          value = ast_reduce(ret, scope, true, ast);
          if (value.body && value.body.pure) {
            ret.body.pure = value.body.pure;
            ret.body.value = value.body.value
          }
          ret.body.scope = value.body.scope;
          return ret

        }
        // eval
        // Experimental eval to AST!!!
        if (match(realCallee, {
          type: 'Identifier',
          name: 'eval'
        }) && ret.purearg) {
          value = ret.arguments[ret.arguments.length - 1];
          if (value.length === 0) {
            return ret;
          }
          debug("eval", value)
          try {
            var _tast = parseAst(value.value);
            var _functionast = ast_reduce(_tast, null, true, ast);
            debug("eval _ Finished", _functionast);
            realCallee.evalued = _functionast;
            if (_functionast.body.length === 1){
               if(_functionast.body[0].type === 'ExpressionStatement')
                return _functionast.body[0].expression;
               else
                return _functionast.body[0];
            }
            else if(_functionast.body.length === 0){
              return mkliteral(undefined);
            } else {
              if (parent.type === 'VariableDeclarator') {
                let evalResBody = _functionast.body;
                let lastExpr = evalResBody[evalResBody.length - 1]
                if (lastExpr.expression && lastExpr.expression.type === 'AssignmentExpression') {
                  let lastLeft = lastExpr.expression.left
                  if (lastLeft.type === 'Identifier') {
                    return {
                      type: 'eval',
                      iden: lastLeft,
                      body: evalResBody
                    }
                  }
                }
              }
              return { //eval is peculiar, it should be very thoroughly how and when expand it
                "type": "ExpressionStatement",
                "expression": {
                  type: "BlockStatement",
                  body: _functionast.body
                },
                "expanded": true
              }
            }             
          } catch (exc) {
            debug("Eval : ", exc)
          }
        }

        // RegExp(X) > /X/i
        if (match(realCallee, {
            type: 'Identifier',
            name: 'RegExp'
          }) && ret.purearg) {
          value = RegExp.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }
        // String(literal)
        if (match(realCallee, {
            type: 'Identifier',
            name: 'String'
          }) && ret.purearg) {
          value = String.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }
        if (match(realCallee, {
            type: 'Identifier',
            name: 'Boolean'
          }) && ret.purearg) {
          value = Boolean.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }

        //atob(literal) 
        if (match(realCallee, {
            type: 'Identifier',
            name: 'atob'
          }) && ret.purearg) {
          value = b64.atob.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }

        //btoa(literal)
        if (match(realCallee, {
            type: 'Identifier',
            name: 'btoa'
          }) && ret.purearg) {
          value = b64.btoa.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }

        if (match(realCallee, {
            type: 'Identifier',
            name: "Date"
          }) && ret.purearg) {
          try {
            value = global["Date"].apply(null,
              ret.arguments.map(getValue));
            return mkliteral(value);
          } catch (e) {}
        }

        var methods1 = ["escape", "unescape", "encodeURIComponent",
          "decodeURIComponent", "encodeURI", "decodeURI"];
        if (realCallee
          && realCallee.type === "Identifier"
          && methods1.indexOf(realCallee.name) !== -1) {
          if (ret.arguments.length) {
            try {
              _tmp = toString(ret.arguments[0]);
            } catch (e) {}
          }
          if (match(realCallee, {
              type: 'Identifier',
              name: realCallee.name
            }) && _tmp) {
            try {
              value = global[realCallee.name].call(null, _tmp);
              return mkliteral(value);
            } catch (e) {}
          }
        }

        // Array methods
        if (match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Identifier',
              name: "concat"
            }
          })) {
          //s_tmp = ret.arguments.map(getValue)
          _tmp = [];
          ret.arguments.forEach(function(el) {
            if (el.type === 'ArrayExpression') {
              _tmp = _tmp.concat(el.elements);
              return;
            }
            _tmp = _tmp.concat(el);
            return;
          });
          return {
            "type": "ArrayExpression",
            "elements": realCallee.object.elements.concat(_tmp)
          }
        }

        if (match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Identifier',
              name: "reverse"
            }
          })) {
          return {
            "type": "ArrayExpression",
            "elements": realCallee.object.elements.reverse()
          };
        }
        // String literal methods
        // removed "match","split",
        var methods1 = ["anchor","big","blink","bold","charAt","charCodeAt","codePointAt",
        "concat","contains","endsWith","fixed","fontcolor","fontsize","includes","indexOf",
        "italics","lastIndexOf","link","localeCompare","normalize","padEnd",
        "padStart","quote","repeat","replace","search","slice","small","startsWith",
        "strike","sub","substr","substring","sup","toLocaleLowerCase","toLocaleUpperCase",
        "toLowerCase","toUpperCase","trim","trimLeft","trimRight","toString"];

        if (realCallee && realCallee.property && methods1.indexOf(realCallee.property.name) !== -1) {
          var strMet = realCallee.property.name;
          if (match(realCallee, {
              type: 'MemberExpression',
              object: {
                type: 'Literal'
              },
              property: {
                type: 'Identifier',
                name: strMet
              }
            }) && ret.purearg) {
            value = realCallee.object.value[strMet].apply(realCallee.object.value,
              ret.arguments.map(getValue));
            return mkliteral(value);
          }

        }
        // "XXX".replace()
        if (match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Literal'
            },
            property: {
              type: 'Identifier',
              name: "replace"
            }
          }) && ret.arguments[0].type === "Literal" && ret.arguments[1].type === "Literal") {
          value = realCallee.object.value.replace.apply(realCallee.object.value,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }

        // "xxx".split(..)
        if (match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Literal'
            },
            property: {
              type: 'Identifier',
              name: 'split'
            }
          }) && ret.purearg) {
          value = realCallee.object.value.split.apply(realCallee.object.value,
            ret.arguments.map(getValue));

          //Commented out, in the end it's very easy to do it without parseAst.
          //var _tast=parseAst(JSON.stringify(value)).body[0].expression;
          var _tast = {
            "type": "ArrayExpression",
            "elements": []
          }
          for (var _t = 0, _l = value.length; _t < _l; _t++) {
            _tast.elements.push({
              type: "Literal",
              value: value[_t],
              raw: "\"" + value[_t] + "\""
            })
          }
          // _tast.computed=true;
          _tast.pured = true;
          _tast.stringable = true;
          _tast.simpleType = true;
          return _tast;
        }
        //Array join & toString
        if ((match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Identifier',
              name: 'join'
            }
          }) || match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Identifier',
              name: 'toString'
            }
          })) && ret.purearg && realCallee.object.stringable) {

          // debug((ret),toString(realCallee.object,"",","))

          var _tast = mkliteral(toString(realCallee.object, "", realCallee.property.name === 'join' && ret.arguments.length ? ret.arguments[0].value : ","))
          //_tast.computed=true;
          _tast.pured = true;

          return _tast;
        }


        // String.fromCharCode()
        if ((match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'String'
            },
            property: {
              type: 'Identifier',
              name: 'fromCharCode'
            }
          }) || match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'String'
            },
            property: {
              type: 'Literal',
              value: 'fromCharCode'
            }
          })) && ret.purearg) {
          value = String.fromCharCode.apply(String,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }
        if ((match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'document'
            },
            property: {
              type: 'Identifier',
              name: 'write'
            }
          }) || match(realCallee, {
            type: 'MemberExpression',
            object: {
              type: 'Identifier',
              name: 'document'
            },
            property: {
              type: 'Literal',
              value: 'writeln'
            }
          })) && ret.purearg) {
          value = ret.arguments.map(getValue);
          value = value.join("");
          value = collectHTMLData(value);
          if (!ret.leadingComments)
            ret.leadingComments = [{
              type: "block",
              value: "@Info:" + (value.code.replace(/\*\//g, ""))
            }]
          else
            ret.leadingComments.push({
              type: "block",
              value: "@Info:" + (value.code.replace(/\*\//g, ""))
            })

          return ret;
        }

        var calleeBody = realCallee.body ? realCallee.body : (realCallee.resolve_to ? realCallee.resolve_to.body : null);
        if (calleeBody && calleeBody.pure) {

          if (calleeBody.body && calleeBody.body.length > 0 && calleeBody.body[calleeBody.body.length - 1].type === "ReturnStatement") {
            return mkliteral(calleeBody.value);
          } else {
            calleeBody.retVal = mkliteral(calleeBody.value);
          }
        } else if ( /*EXPERIMENTAL!*/ calleeBody && calleeBody.body && calleeBody.body.length === 1 && calleeBody.body[0].argument && calleeBody.scope.hasOwnProperty("returns")
          && calleeBody.scope.returns === 1) {

          //TODO   We need to copy the function scope and add params values!! tmp_scope = Object.create(calleBody.scope)
          //       Copy all values.
          var _callee = realCallee.params ? realCallee : (realCallee.resolve_to.params ? realCallee.resolve_to : null);
          var tmp_scope = Object.create(calleeBody.scope);
          _callee.params.map(function(p, i) {
            tmp_scope[p.name] = {
              value: c_arguments[i] || undefined,
              pure: false
            };
            if (!tmp_scope[PARAMS_NAME])
              tmp_scope[PARAMS_NAME] = {}
            tmp_scope[PARAMS_NAME][p.name] = {
              value: c_arguments[i] || undefined,
              pure: false
            };
          });          

          return ast_reduce(calleeBody.body[0].argument, tmp_scope, expandvars, ast);
        }

        //
        if (realCallee.type === "Identifier") {
          valFromScope = findScope(realCallee.name, scope);
          let funcDeclaration = funcBodyMap.get(realCallee.name)
          if (!valFromScope && funcDeclaration) {
            // not found in val scope but in func declaration
            valFromScope = {
              value: {
                value: funcDeclaration
              }
            }
          }
          if (valFromScope && valFromScope.value && valFromScope.value.value) {
            if (valFromScope.value.value.type === 'FunctionExpression' || valFromScope.value.value.type === 'FunctionDeclaration') {
              if (!valFromScope.value.value.alreadyReduced) {
                value = ast_reduce_scoped(valFromScope.value.value);  
              }
              if (valFromScope.value.value.body && valFromScope.value.value.body.body) {
                // check if this function returns something...
                // if nothing gets returned then just return ast
                let functionBodies = valFromScope.value.value.body.body;
                let hasReturn = functionBodies.filter(function(e) {
                  return e.type === 'ReturnStatement';
                }).length > 0;
                if (hasReturn) {
                  if (valFromScope.value.value.params && c_arguments && valFromScope.value.value.params.length === c_arguments.length) {
                    // the same number of arguments called
                    valFromScope.value.value.params.map((p , i) => {
                      scope[p.name] = {
                        value: c_arguments[i],
                        pure: c_arguments[i].pure,
                        isParam: true
                      }
                    })
                  }
                  // check if we have evaluated before, check in the scope
                  let funcbody = valFromScope.value.value.body
                  let previousFuncPurity = funcbody.pure 
                  funcbody.pure = true
                  let newbody = [];
                  let mergeMap = new Map()
                  // Here we need to rename all the variables declarations and assignments with a random number append to the end of the variable name
                  // E.g  var PD = 3 -> var PD_1624623412 = 3
                  // PD = 10 -> PD_1624623412 = 10
                  funcbody.body.forEach(ex =>{
                    let retValNewName = renameVarWithNewName(ex, mergeMap, funcBodyMap)
                    newbody.push(retValNewName[0])
                    mergeMap = new Map([...retValNewName[1], ...mergeMap])
                  })
                  funcbody.body = newbody
                  value = ast_reduce_scoped(funcbody);
                  // this will be the return value of the function call
                  // reset to the funcbody
                  funcbody.pure = previousFuncPurity
                  // filter out any top level return statements
                  let noRetBody = value.body.filter(e => e.type !== "ReturnStatement")
                  // remove all the params
                  if (valFromScope.value.value.params && c_arguments && valFromScope.value.value.params.length === c_arguments.length) {
                    // the same number of arguments called
                    valFromScope.value.value.params.map((p , i) => {
                      if (scope[p.name].isParam) {
                        delete scope[p.name]
                      }
                    })
                  }

                  if (value.pure) {
                    let bodyRetVal = mkliteral(value.value);
                    bodyRetVal.body = noRetBody
                    return bodyRetVal
                  } else if (value.body){
                    let retAST = null
                    for (var i = 0; i < value.body.length; i++){
                      // TODO FIND BETTER WAY TO ESTIMATE RETURN VALUE
                      // find the first return statement that returns pure
                      // this is technically wrong because of branches and errors,
                      // ... but without execution this is the best we can do
                      let ex = value.body[i]
                      if (ex.type === 'ReturnStatement') {
                        let bodyRetVal = ex.argument
                        if (ex.pure) {
                          bodyRetVal = mkliteral(ex.argument.value);
                        }
                        if (!isEqual(noRetBody[0], consoleLogExpr('Begining body of ' + realCallee.name))) {
                          noRetBody = [consoleLogExpr('Begining body of ' + realCallee.name)].concat(noRetBody)
                          noRetBody.push(consoleLogExpr('End body of ' + realCallee.name))
                        }
                        
                        // noRetBody = noRetBody.map(ex => renameVarWithNewName(ex, new Map(), funcBodyMap))
                        bodyRetVal.body = noRetBody
                        retAST = bodyRetVal
                        return retAST
                      }
                    }
                    // if we cant find a pure return statement, then this call is too hard to inline
                    return ast 
                  } else {
                    // cannot be reduced purely
                    return ast
                  }
                } else {
                  // it doesnt have a return so lets see if we can just inline the function
                  // check if parent you are in assignment if it is, do NOT replace
                  //
                  if (parent.type !== 'ExpressionStatement') {
                    return ast
                  }
                  if (valFromScope.value.value.params && c_arguments && valFromScope.value.value.params.length === c_arguments.length) {
                    // the same number of arguments called
                    valFromScope.value.value.params.map((p , i) => {
                      scope[p.name] = {
                        value: c_arguments[i],
                        pure: c_arguments[i].pure,
                        isParam: true
                      }
                    })
                  }

                  let funcbody = valFromScope.value.value.body
                  funcbody.pure = true
                  let reducedBody = ast_reduce_scoped(funcbody);
                  
                  if (valFromScope.value.value.params && c_arguments && valFromScope.value.value.params.length === c_arguments.length) {
                    // the same number of arguments called
                    valFromScope.value.value.params.map((p , i) => {
                      if (scope[p.name].isParam) {
                        delete scope[p.name]
                      }
                    })
                  }
                  return reducedBody // need to change
                }
              }
              // Here they need to bind the arguments
            } else {
              value = valFromScope.value.value;
            }

            if (value && value.body && value.body.pure) {
              ret.callee = realCallee = value;
              if (_tmp) {
                _tmp.expressions[_tmp.expressions.length - 1] = realCallee;
                ret.callee = _tmp;
              }
            }
          }
        }
        
        //Has body or resolve_to with body and has only return statement
        ret.callee = realCallee

        //debug("************************",ret.purearg,realCallee, realCallee.body , realCallee.callable,"************")
        if (ret.purearg && realCallee.body && (expandvars || realCallee.body.scope.closed) && realCallee.callable) {
          try {
            var simple_types = ['number', 'string', 'boolean', 'undefined']
            if (realCallee.resolve_to) {
              var newArgs = [],
                newParams = [];
              if (realCallee.resolve_to.body.scope.externalWrite) {
                return ret;
              }
              if (realCallee.resolve_to.body.scope.externalRefs) {
                var extRef = realCallee.resolve_to.body.scope.externalRefs;
                for (var idx = 0, idxlen = extRef.length; idx < idxlen; idx++) {
                  if (!extRef[idx].retVal) {
                    if (extRef[idx].type === 'Identifier') {
                      valScope = findScope(extRef[idx].name, scope);
                    }

                    if (valScope && valScope.value) {
                      newArgs.push(valScope.value.value);
                      newParams.push(extRef[idx]);
                    }
                  } else {
                    if (extRef[idx].retVal[CURRENT_OBJ])
                      newArgs.push(extRef[idx].retVal[CURRENT_OBJ]);
                    else
                      newArgs.push(extRef[idx].retVal);
                    newParams.push(extRef[idx]);
                  }
                }

              }
              ///////////// Going to perform partial exec.
              if (realCallee.resolve_to.body.scope['.uses_this']) {
                if (realCallee.object) {
                  if (realCallee.object.type === 'MemberExpression') {
                    var resolved = resolveMemberExpression(realCallee.object, scope);
                    if (resolved) {
                      resolved = resolved.value.value
                    }
                  } else if (realCallee.object.type === 'Identifier') {
                    var resolved = findScope(realCallee.object.name, scope);
                    if (resolved) {
                      resolved = resolved.value.value
                    }
                  }
                }
                value = {
                  "type": "CallExpression",
                  "callee": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                      "type": "FunctionExpression",
                      "id": realCallee.resolve_to.id,
                      "params": realCallee.resolve_to.params ? realCallee.resolve_to.params.concat(newParams) : newParams,
                      "defaults": [],
                      "body": realCallee.resolve_to.body
                    },
                    "property": {
                      "type": "Identifier",
                      "name": "call"
                    }
                  },
                  arguments: [resolved ? resolved[CURRENT_OBJ] : {
                    type: "Identifier",
                    name: "this"
                  }].concat(ret.arguments).concat(newArgs)
                }

                /*var ctxt_Obj = {
                  atob: atob,
                  btoa: btoa
                }*/
                var _btoa = btoa.bind(null);
                _btoa.__proto__ = null;
                var _atob = atob.bind(null);
                _atob.__proto__ = null;
                var ctxt_Obj = {
                  atob: {
                    writable: true,
                    configurable: true,
                    value: _atob
                  },
                  btoa: {
                    writable: true,
                    configurable: true,
                    value: _btoa
                  }
                };
                try {
                  if (USE_PARTIAL) {
                    var vm_returned = vm.runInNewContext("(" + genCode(value) + ")", Object.create(null, ctxt_Obj));
                  }
                } catch (exc1) {
                  console.log("EXC", exc1, exc1.stack, genCode(value))
                }
                if (!vm_returned || simple_types.indexOf(typeof vm_returned) !== -1)
                  return mkliteral(vm_returned);
                else if (typeof vm_returned === 'function') {
                  _tast = parseAst(vm_returned.toString()).body[0];
                  _tast.type = "FunctionExpression";
                  return ast_reduce(_tast, scope, expandvars, ast);;
                } else {
                  return parseAst(JSON.stringify(vm_returned));
                }
              }
              if (ret.arguments.length < realCallee.resolve_to.params.length) {
                for (var i = 0, l = realCallee.resolve_to.params.length - ret.arguments.length; i < l; i++)
                  ret.arguments.push(mkliteral({
                    type: "Identifier",
                    name: "undefined"
                  }))
              }
              value = {
                "type": "CallExpression",
                "callee": {
                  "type": "FunctionExpression",
                  "id": realCallee.resolve_to.id,
                  "params": realCallee.resolve_to.params ? realCallee.resolve_to.params.concat(newParams) : newParams,
                  "defaults": [],
                  "body": realCallee.resolve_to.body
                },
                "arguments": ret.arguments ? ret.arguments.concat(newArgs) : newArgs

              }
              /*var ctxt_Obj = {
                atob: atob,
                btoa: btoa
              }*/
              var _btoa = btoa.bind(null);
              _btoa.__proto__ = null;
              var _atob = atob.bind(null);
              _atob.__proto__ = null;
              var ctxt_Obj = {
                atob: {
                  writable: true,
                  configurable: true,
                  value: _atob
                },
                btoa: {
                  writable: true,
                  configurable: true,
                  value: _btoa
                }
              };
              try {
                if (USE_PARTIAL) {
                  var vm_returned = vm.runInNewContext("(" + genCode(value) + ")", Object.create(null, ctxt_Obj));
                }
              } catch (exc1) {
                console.log("EXC", exc1, exc1.stack, genCode(value))
              }
              if (!vm_returned || simple_types.indexOf(typeof vm_returned) !== -1)
                return mkliteral(vm_returned);
              else if (typeof vm_returned === 'function') {
                _tast = parseAst(vm_returned.toString()).body[0];
                _tast.type = "FunctionExpression";
                return ast_reduce(_tast, scope, expandvars, ast);;
              } else {
                return parseAst(JSON.stringify(vm_returned));
              }
            } else {

              var newArgs = [],
                newParams = [];
              if (realCallee.body.scope.externalWrite) {
                return ret;
              }
              if (realCallee.body.scope.externalRefs) {
                var extRef = realCallee.body.scope.externalRefs;
                for (var idx = 0, idxlen = extRef.length; idx < idxlen; idx++) {
                  if (!extRef[idx].retVal) {
                    if (extRef[idx].type === 'Identifier') {
                      valScope = findScope(extRef[idx].name, scope);
                    }
                    if (valScope && valScope.value) {
                      newArgs.push(valScope.value.value);
                      newParams.push(extRef[idx]);

                    }
                  } else { //Mettere CURRENT_OBJ.
                    if (extRef[idx].retVal[CURRENT_OBJ])
                      newArgs.push(extRef[idx].retVal[CURRENT_OBJ]);
                    else
                      newArgs.push(extRef[idx].retVal);
                    newParams.push(extRef[idx]);
                  }
                }

              }
              if (ret.arguments.length < realCallee.params.length) {
                for (var i = 0, l = realCallee.params.length - ret.arguments.length; i < realCallee.params.length; i++)
                  ret.arguments.push(mkliteral({
                    type: "Identifier",
                    name: "undefined"
                  }))
              }
              debug("***************** Executing function ", genCode(ret), "in sandbox as it's closed***********");
              value = {
                "type": "CallExpression",
                "callee": {
                  "type": "FunctionExpression",
                  "id": realCallee.id,
                  "params": realCallee.params ? realCallee.params.concat(newParams) : newParams,
                  "defaults": [],
                  "body": realCallee.body
                },
                "arguments": ret.arguments ? ret.arguments.concat(newArgs) : newArgs
              }
              /*var ctxt_Obj = {
                atob: atob,
                btoa: btoa
              }*/
              var _btoa = btoa.bind(null);
              _btoa.__proto__ = null;
              var _atob = atob.bind(null);
              _atob.__proto__ = null;
              var ctxt_Obj = {
                atob: {
                  writable: true,
                  configurable: true,
                  value: _atob
                },
                btoa: {
                  writable: true,
                  configurable: true,
                  value: _btoa
                }
              };
              try {
                if (USE_PARTIAL) {
                  var vm_returned = vm.runInNewContext("(" + genCode(value) + ")", Object.create(null, ctxt_Obj));
                }
              } catch (exc1) {
                console.log("EXC", exc1, exc1.stack, genCode(value))
              }
              if (!vm_returned || simple_types.indexOf(typeof vm_returned) !== -1) {
                return mkliteral(vm_returned);
              } else if (typeof vm_returned === 'function') {
                _tast = parseAst(vm_returned.toString()).body[0];
                _tast.type = "FunctionExpression";
                return ast_reduce(_tast, scope, expandvars, ast);;
              } else {
                return parseAst(JSON.stringify(vm_returned));
              }
            }
          } catch (exc) {
            try {
              if (!ret.leadingComments)
                ret.leadingComments = [{
                  type: "block",
                  value: "@Info: Executed but got error: " + (exc.toString().replace(/\*\//g, ""))
                }]
              else
                ret.leadingComments.push({
                  type: "block",
                  value: "@Info: Executed but got error" + (exc.toString().replace(/\*\//g, ""))
                })
              console.log("Error:", exc, ret, exc.stack);
            } catch (exc1) {
              console.log("Error:", exc1, ret)
            }
          }
        }

        return ret;

      case 'Literal':
        return mkliteral(ast.value, ast.raw);

      case 'Identifier':
        debug("Identifier", ast.name, "scope", (scope), ast.name, "ExpVar?", expandvars)

        var isLocal = false;
        valFromScope = false;
        if (inLoop)
          return ast;
        if (ast.name in scope) {
          //BUG WARNING: on MemberExpr. when local var has same name. we may have probl
          // TODO: find a workaround: var f={h:3}; function s(){   var t=3; f.t=2; /*f.*t* same name t.*/ }
          valFromScope = findScope(ast.name, scope);
          isLocal = valFromScope.scope === scope && parent.type !== 'MemberExpression'
          debug("scoped", 'isLocal', valFromScope.scope === scope, 'isGlobal', scope === gscope);
          // console.log("scoped", 'isLocal', valFromScope.scope === scope, 'isGlobal', scope === gscope);
          // console.log("if its changed", scope[ast.name].changed)
          let hasChanged = scope[ast.name].changed
          if (hasChanged) {
            return ast
          }
          if (valFromScope.scope !== scope) {
            scope.closed = false;
            if ((parent.type !== 'MemberExpression' || ast.firstObj) && scope.externalRefs.indexOf(ast) === -1)
              scope.externalRefs.push(ast);
          }
          valFromScope = valFromScope.value || {};
        
          if (valFromScope.value && valFromScope.value.value)
            valFromScope.pure = valFromScope.value.pure;
        } else if (global_vars.indexOf(ast.name) !== -1 && scope.closed !== false) {

          scope.closed = true;
          debug(ast)
          if (ast.name === 'undefined' && ast.value === undefined) {
            ast.value = undefined;
            ast.pure = true;
          }
          if(ast.name === 'Infinity' && ast.value === undefined){
            ast.value = Infinity;
            ast.pure = true;
          }
          if(ast.name === 'NaN' && ast.value === undefined){
            ast.value = NaN;
            ast.pure = true;
          }
          
        } else { // Problem, this Ident is called for a.b.c as well as for a 
          if ((parent.type !== 'MemberExpression' || ast.firstObj) && scope != gscope) {
            debug("CLOSED!")
            scope.closed = false;
            // Not Found!! Still we want to add externalRefs.
            if (scope.externalRefs.indexOf(ast) === -1)
              scope.externalRefs.push(ast); // We have s.g.e -> ast.name === 'e' getRealVal to see if is external or in scope);
          //scope.externalRefs.push(// We have s.g.e -> ast.name === 'e' getRealVal to see if is external or in scope);
          }
        }

        if (ast.name in scope && valFromScope.pure) { // pure==Literals
          value = mkliteral(valFromScope.value);
        } else if (ast.name in scope &&
          (valFromScope.purable || valFromScope.pure_global)) {
          value = valFromScope.value;

        } else if (expandvars && (ast.name in gscope)
          && (gscope[ast.name].pure_global || gscope[ast.name].pure)) {
          value = mkliteral(gscope[ast.name].value);
          ast.retVal = value;
          if (typeof gscope[ast.name].value.type === "undefined")
            return value;
          else
            return ast;
        } else if (valFromScope.value) {
          value = valFromScope.value
        }

        if (value && value.type === 'NewExpression') {
          // new expressions dont return a new one becuase of the side effects
          return ast
        }
        
        if (expandvars && value) { //May not be enough. g.t.*e* ? on globalscope?         
          return value;
        } else {
          
          if (value) {
            ast.retVal = value;
            ast.retVal.isLocal = isLocal;
          }
          return ast;
        }

      case 'ArrayExpression':
        debug('ArrayExpression')
        ret = {
          type: ast.type,
          computed: true,
          elements: ast.elements.map(ast_reduce_scoped)
        };
        // can [...].toString Array be always reduced? in which sceneries?
        // trying to find a way to figure it out.
        // the following is a test.
        // Look all elements if they are easily castable to String
        // Eg non "stringable": [i=2,"ddd"] <- expression inside
        // or [ident, xxx...]
        // nested arrays or array w/ objects or funzioni are on the other side "stringable":)
        ret[CURRENT_OBJ] = objCopy(ret);
        var stringabletypes = ["ObjectExpression", "Literal", "FunctionExpression"];

        ret.stringable = ret.elements.every(function(a) {
          return stringabletypes.indexOf(a.type) !== -1 || a.pure || a.pured || a.purable || a.pure_global || a.stringable
        })
        ret.simpleType = ret.elements.every(function(a) {
          debug("SIMPLETYPE: ", a); return a.type === "Literal"
        });
/*        ret.elements.forEach((el,index )=> {el.leadingComments=[{
          type: "block",
          value: "["+index+"]"
        }]});*/
        return ret;

      case 'ObjectExpression':
        ret = {};
        ret.type = 'ObjectExpression';
        ret.properties = ast.properties.map(function(pr) {

          /*if(pr.value.type==='FunctionExpression')
            scope_set_maybe_this(pr.value, ret ); */
          var _tp = ast_reduce_scoped(pr.value);
          if (_tp.type === 'MemberExpression') {
            _tmp = resolveMemberExpression(pr.value, scope, true); //recurse to find it refers to a function
            if (_tmp.resolved && _tmp.resolved.value.type === 'FunctionExpression')
              _tp = _tmp.resolved.value; //TODO: See for retVal or similar.
          }

          return {
            type: pr.type,
            key: pr.key,
            value: _tp
          };
        });

        //ObjectExpression: this add parent node to properties
        //We'll use it when: 
        //ob.prop=x to adjust to its value in scope.
        for (var i = 0, l = ret.properties.length; i < l; i++)
          ret.properties[i].parent = ret;

        ret[CURRENT_OBJ] = objCopy(ret);
        scope_set_maybe_this(scope, ret);

        return ret

      case 'MemberExpression':
        var _tretObj;
        debug("MemberExpression Cerco: ", ast.object, "....", ast.property);
        if (parent.type !== 'MemberExpression')
          ast.object.firstObj = true;
        ret = {
          type: ast.type,
          computed: ast.computed, // true if :object["test"] or object[test] false if ob.test
          object: ast_reduce_scoped(ast.object, true),
          // do not expand identifiers as variables if they are not in square brackets
          property: ast.computed ?
            //Error, if computed is true, should expand to be true ?! 
            ast_reduce(ast.property, scope, true, ast)
            : ast_reduce(ast.property, scope, false, ast)
        }
        // replace ['property'] with .property accessor
        _tretObj = ret.object;
        if (ret.object.retVal) {
          _tretObj = ret.object;
          ret.object = ret.object.retVal;
        }
        if (parent.type !== 'MemberExpression' && scope.closed || scope === gscope) {
          //to cover cases like obj external

          value = getObjectPath(ret);
          if (value && !value.isNativeProp) {
            valScope = findScope(value.name, scope)
            if (!valScope || valScope.scope !== scope) {
              scope.closed = false;
            }
          }
          value = resolveMemberExpression(ret, scope);
        }

        if (ret.object.type === "MemberExpression") { // XXX_STE....mmm
          value = resolveMemberExpression(ret.object, scope);
          if (value.resolved) {
            value = value.resolved;
            if (value.type === "Property") {
              ret.object = value.value;
              _tretObj = value.value;
            }
          }
        }
        /*if(ret.object.type==="Identifier" && ret.object.retVal){
          ret.object=ret.object.retVal;
        }*/

        if (ret.property.type === "MemberExpression") {
          value = resolveMemberExpression(ret.property, scope);
          if (value.resolved) {
            value = value.resolved;
            if (value.type === "Property")
              ret.property = value.value;
          }
        }
        //debug("MemberExpression >>>>>>>>>>> ", _tretObj, "C___________C", ast_reduce(ast.property, scope, false, ast), "____", ret.object, ast.computed, ret.property, Error().stack);
        if (ret.property.pure && /^[a-z_$][a-z_$0-9]*$/i.test('' + ret.property.value)) {
          ret.computed = false;
          ret.property = {
            type: 'Identifier',
            name: ret.property.value
          };
        }

        if (!ret.property.parent) {
          ret.property.parent = ret;
        }

        // ['fds','gfd'][..] direct access to array elements 
        if (match(ret, {
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Literal',
              pure: true
            }
          })) {
          debug("ArrayExpression a[1]", ret.object.elements, ret.property.value, ret.object.elements[ret.property.value]);

          value = ret.object.elements[ret.property.value];
          if (!value) {
            // the return is undefined
            return ast
          }
          ret.object = _tretObj;

          if (typeof value !== 'object')
            return mkliteral(value);
          else
            return value;
        }

        if (match(ret, {
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'ArrayExpression',
              computed: true
            }
          })) {

          value = ret.object.elements[toString(ret.property)]
          debug(toString(ret.property), value);
          ret.object = _tretObj;
          if (typeof value !== 'object')
            return mkliteral(value);
          else
            return value;

        }

        if (match(ret, {
            object: {
              type: 'Literal',
              pure: true
            },
            property: {
              type: 'Literal',
              pure: true
            }
          })) {
          value = mkliteral(ret.object.value[ret.property.value]);
          ret.object = _tretObj;
          return value;
        }

        if (match(ret, {
            object: {
              type: 'Literal'
            },
            property: {
              name: 'length'
            }
          }) || match(ret, {
            object: {
              type: 'Literal'
            },
            property: {
              type: 'Literal',
              value: 'length'
            }
          })) {
          value = {
            type: 'Literal',
            pure: true,
            value: ret.object.value.length,
            raw: ret.object.value.length
          };
          ret.object = _tretObj;
          return value;
        }
        // RegExps
        if (ret.object.type === "Literal" && ret.object.value instanceof RegExp) {
          if (typeof ret.object.value[ret.property.name] !== "function") {
            value = mkliteral(ret.object.value[ret.property.name]);
            ret.object = _tretObj;
            return value;
          }
        }

        // Date
        if (ret.object.type === "NewExpression" && ret.object.retVal2 instanceof Date) {

          if (ret.property.name === "time") {
            value = mkliteral(ret.object.retVal2.getTime());
            ret.object = _tretObj;
            return value;
          }
        }
        //constructor
        if (match(ret, {
            object: {
              type: 'Literal'
            },
            property: {
              type: 'Identifier',
              name: "constructor"
            }
          })) {
          value = {
            type: 'Identifier',
            name: ret.object.value[ret.property.name].name
          }
          ret.object = _tretObj;
          return value;
          return mkliteral(ret.object.value[ret.property.name]);
        }
        if (match(ret, {
            object: {
              type: 'Identifier'
            },
            property: {
              type: 'Identifier',
              name: "constructor"
            }
          })) {
          if (global[ret.object.name]) {
            value = {
              type: 'Identifier',
              name: global[ret.object.name][ret.property.name].name
            }
            ret.object = _tretObj;
            return value;
          }
        }
        if (match(ret, {
            object: {
              type: 'ArrayExpression'
            },
            property: {
              type: 'Identifier',
              name: "constructor"
            }
          })) {
          ret.object = _tretObj;
          return {
            type: 'Identifier',
            name: [].constructor.name
          }
          return mkliteral(ret.object.value[ret.property.name]);
        }
        if (match(ret, {
            object: {
              type: 'ObjectExpression'
            },
            property: {
              type: 'Identifier',
              name: "constructor"
            }
          })) {
          ret.object = _tretObj;
          return {
            type: 'Identifier',
            name: {}.constructor.name
          }
          return mkliteral(ret.object.value[ret.property.name]);
        }
        if (match(ret, {
            object: {
              type: 'FunctionExpression'
            },
            property: {
              type: 'Identifier',
              name: "constructor"
            }
          })) {
          ret.object = _tretObj;
          return {
            type: 'Identifier',
            name: Function.name
          }
          return mkliteral(ret.object.value[ret.property.name]);
        }
        ret.object = _tretObj;
        return ret;


      case 'VariableDeclaration':
        ret = {
          type: ast.type,
          kind: ast.kind,
          declarations: ast.declarations.map(ast_reduce_scoped)
        };
        let delcaredSubBodies = []
        ret.declarations.forEach(declaration => {
          if (declaration.body) {
            declaration.body.forEach(exp => {delcaredSubBodies.push(exp)})
          }
        })
        ret.body = delcaredSubBodies
        ret.pure = ret.declarations.every(function(e) {
          return !e.init || e.init.pure || e.init.pured || e.init.purable || e.init.pure_global;
        });

        return ret;


      case 'VariableDeclarator':
        ret = {
          type: ast.type,
          id: ast_reduce_scoped(ast.id),
        };
        let init = ast_reduce_scoped(ast.init)
        if (init && init.type === 'eval') {
          ret.init = init.iden
          ret.body = init.body
          ret.eval = true
          return ret
        }
        if (init && init.body) {
          ret.body = init.body
        }

        ret.init = init

        var _scopeVal = ret.init;
        debug("VariableDeclarator::", _scopeVal)
        if (ret.init && ret.init.retVal)
          _scopeVal = ret.init.retVal

        debug('VariableDeclarator', ret)
        if (ret.init && ret.init.type === "Identifier" && _scopeVal && (expandvars || _scopeVal.isLocal)) {
          ret.init = _scopeVal;
        }
        if (_scopeVal && _scopeVal.pure) {
          set_scope(scope, ast.id.name, {
            value: _scopeVal.value,
            pure: true,
            changed: false
          });
        } else if (_scopeVal && _scopeVal.type === "Identifier" && global_vars.indexOf(_scopeVal.name) !== -1) {
          set_scope(scope, ast.id.name, {
            value: _scopeVal,
            pure_global: true,
            changed: false
          });
        } else if (_scopeVal && _scopeVal.type === "ArrayExpression") {
          set_scope(scope, ast.id.name, {
            value: _scopeVal,
            purable: true,
          });
        } else if (_scopeVal && _scopeVal.type === "UnaryExpression" && _scopeVal.argument.pure) {
          set_scope(scope, ast.id.name, {
            value: _scopeVal.value,
            pure: true,
            changed: false
          });
        } else if (_scopeVal && _scopeVal.type === "ObjectExpression") { // VariableDeclarator

          debug("Object?? VariableDeclarator", (_scopeVal))
          if (!scope[OBJECTS_NAME])
            scope[OBJECTS_NAME] = [];
          ret.init[CURRENT_OBJ] = objCopy(_scopeVal);
          scope[OBJECTS_NAME].push(_scopeVal);
          set_scope(scope, ast.id.name, {
            value: _scopeVal,
            pure: false,
            changed: false
          });

        } else if (_scopeVal && _scopeVal.type === "MemberExpression") { // VariableDeclarator
          debug('MemberExpression VariableDeclarator>>>', _scopeVal)
          var _tmp = _scopeVal
          var _obj = getObjectPath(_tmp);
          if (!_obj)
            return ret;
          valFromScope = findScope(_obj.name, scope);
          var valScope = valFromScope.scope;
          var _sval = valFromScope = valFromScope.value;
          var _lval = _tmp.property; // last one 
          if (!_sval) {
            set_scope(scope, ast.id.name, {
              value: _scopeVal,
              pure: false,
              changed: false
            });
            return ret;
          } else if (_sval.pure_global) {

            if (valFromScope.value.name === 'window') {
              _lval = {
                result: {
                  type: "Property",
                  value: {
                    type: "Identifier",
                    name: "ZZZ"
                  }
                },
                isNative: true,
                proparr: _obj.proparr
              };
            }
          }

          debug("MEMBEREXPRESSION", valFromScope, _obj, genCode(ret))
          if (!_sval.value) {
            set_scope(scope, ast.id.name, {
              value: _scopeVal,
              pure: false,
              changed: false
            });
            return ret;
          }
          if (_sval.value[CURRENT_OBJ] && (_sval.value[CURRENT_OBJ].type === "ObjectExpression" ||
            _sval.value[CURRENT_OBJ].type === "ArrayExpression")) {
            _lval = findPropFromAST(_sval.value[CURRENT_OBJ], _obj.proparr)
          } else {
            _lval = {
              result: _sval.value[CURRENT_OBJ],
              isNative: true,
              proparr: _obj.proparr,
              changed: false
            };
          }
          debug("MEMBEREXPRESSION2", _lval)

          if (_lval.result && _lval.result.type === "Property") {
            ret.init = _lval.result.value
            debug("Found!!", _lval.result.value)
          } else if (typeof _lval.k !== "undefined") {
            debug("Not Found!!", _lval);
            ret.init = ast_reduce_scoped({
              type: "MemberExpression",
              object: _lval.result.value,
              property: {
                type: "Literal",
                value: _obj.proparr[_lval.k - 1]
              }
            })
          } else if (_lval.last_resolved) {
            ret.init = mkliteral({
              "type": "Identifier",
              "name": "undefined",
              changed: false
            });
          }

          set_scope(scope, ast.id.name, {
            value: ret.init,
            pure: false,
            changed: false
          });
        } else {
          set_scope(scope, ast.id.name, {
            value: _scopeVal,
            pure: false,
            changed: false
          });
        }
        //Scoped means declared but exists also a global version
        //scope[ast.id.name].overrides = gscope[ast.id.name]?true:false

        return ret;


      case 'FunctionDeclaration':
      //Eg function f(b){cc} 

        fscope = Object.create(scope);
        fscope.externalRefs = [];
        fscope.closed = true;

        ast.params.map(function(p) {
          fscope[p.name] = {
            value: undefined,
            pure: false
          };
          //fscope is a function scope so we set params object to discriminate
          //local variables from params when function is called.
          if (!fscope[PARAMS_NAME])
            fscope[PARAMS_NAME] = {}
          fscope[PARAMS_NAME][p.name] = {
            value: undefined,
            pure: false
          };
        });

        ret = {
          type: ast.type,
          id: ast.id,
          params: ast.params,
          body: ast_reduce(ast.body, fscope, false, ast),
          test: ast.test,
          alreadyReduced: true,
          generator: ast.generator,
          expression: ast.expression
        };
        if (ast.id) {
          set_scope(scope, ast.id.name, {
            value: ret,
            pure: false
          });
        }
        scopes.push(fscope)
        ret.body.scope = scopes[scopes.length - 1];
        ret.body.scopeidx = scopes.length - 1;
        ret.body.leadingComments = [{
          type: "block",
          value: "Scope Closed:" + fscope.closed +
            (!fscope.closed ? " | writes:" + (fscope.externalWrite ? true : false) : "")
        }]
        return ret;

      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
      //Eg var t=function f(b){cc}  ; t=function f(b){cc} ; (function g(){})..

        fscope = Object.create(scope);
        fscope.externalRefs = [];
        fscope.closed = true;

        scopes.push(fscope);

        if (parent.type === "ObjectExpression")
          scope_set_this(fscope, parent);
        var _replarg = ast.called && ast.called_with_args
        ast.params.map(function(p, i) {

          fscope[p.name] = {
            value: _replarg ? ast.called_with_args[i] : undefined,
            pure: false
          };
          if (!fscope[PARAMS_NAME])
            fscope[PARAMS_NAME] = {}
          fscope[PARAMS_NAME][p.name] = {
            value: _replarg ? ast.called_with_args[i] : undefined,
            pure: false
          };
        });

        value = ast_reduce(ast.body, fscope, false, ast);
        value.scope = scopes[scopes.length - 1]
        value.scopeidx = scopes.length - 1;
        debug("FunctionExpression", "isCalled?", (ast), 'scope:', scopes[value.scope]);
        ret = {
          type: ast.type,
          id: ast.id,
          params: ast.params,
          defaults: ast.defaults,
          body: value,
          test: ast.test,
          generator: ast.generator,
          alreadyReduced: true,
          expression: ast.expression
        };
        if (ast.id) { //adding function name  to  scope
          scope[ast.id.name] = {
            value: ret,
            pure: false
          };
        }

        if (ast.called && (fscope.closed || !fscope.externalWrite) && //has a return Statement?
          (ret.body && ret.body.body && ret.body.body.length > 0 && ret.body.body[ret.body.body.length - 1].type === "ReturnStatement")) {
          ret.callable = true;
        }
        ret.body.leadingComments = [{
          type: "block",
          value: " Called:" + ast.called + " | Scope Closed:" + fscope.closed +
            (!fscope.closed ? "| writes:" + (fscope.externalWrite ? true : false) : "")
        }]
        return ret;


      case 'BlockStatement':
        
        ret = {
          type: ast.type,
        };
        let RetBody = ast.body.map(ast_reduce_scoped)
        taintedScope = null
        let RetFlattenBody = []
        // let currentScopeDeclared = []
        RetBody.forEach(expr => {
          if (expr) {
            if (expr.type === 'BlockStatement') {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.body.forEach(ex => {RetFlattenBody.push(ex)})
            } else if (expr.type === "ReturnStatement" && expr.argument && expr.argument.type === 'CallExpression' &&  expr.argument.callee &&  expr.argument.callee.body && expr.argument.callee.body.body) {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.argument.callee.body.body.forEach(ex => {RetFlattenBody.push(ex)})
              RetFlattenBody.push(expr)
            } else if (expr.type === "ExpressionStatement" && expr.expression.type === 'AssignmentExpression' && expr.expression.right && expr.expression.right.body) {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.expression.right.body.forEach(ex => {RetFlattenBody.push(ex)})
              RetFlattenBody.push(expr)
            } else if (expr.type === "ReturnStatement" && expr.argument && expr.argument.body) {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.argument.body.forEach(ex => {RetFlattenBody.push(ex)})
              RetFlattenBody.push(expr)
            }  else if (expr.body) {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.body.forEach(ex => {RetFlattenBody.push(ex)})
              RetFlattenBody.push(expr)
            } else if (expr.eval) {
              // NEED TO SEE IF THEY HAVE AN ASSIGNMENT STATEMENT OR VARIABLE DECLARATOR THAT WILL CHANGE THE VARIABLE IN THE CURRENT SCOPE
              expr.body.forEach(ex => {RetFlattenBody.push(ex)})
              RetFlattenBody.push(expr)
            } else {
              RetFlattenBody.push(expr)
            }
          }
        })
        // reduce any new call expr statment that are converted to function body type
        ret.body = RetFlattenBody
        last = ret.body && ret.body.length > 0 && ret.body[ret.body.length - 1];
        // if there is an if statemnet, it is pure if the test can be evaluated
        pure = ret.body && ret.body.every(function(e) {
          return e.pure;
        });
        debug("BlockStatement :: ", pure, !!last, last.type === 'ReturnStatement', last.argument, last.argument && (last.argument.pure || (last.argument.type === 'Identifier' && global_vars.indexOf(last.argument.name) !== -1)))
        // if body.pure and returns a pure val or returns a globalObject.
        if (pure && last && last.type === 'ReturnStatement' &&
          last.argument &&
          (last.argument.pure ||
          (last.argument.type === 'Identifier' &&
          global_vars.indexOf(last.argument.name) !== -1))) {
          if (last.argument.pure) { //If return is "pure" return the literal
            return {
              type: ast.type,
              pure: true,
              value: last.argument.value,
              body: [last]
            }
          } else { //Else just the plain object
            return {
              type: ast.type,
              pure: true,
              value: last.argument,
              body: [last]
            }
          }
        } else {
          ret.pure = pure;
          return ret;
        }


      case 'ReturnStatement':
        debug('ReturnStatement');
        if(ast.argument==null){
          return ast;
        }

        value = ast_reduce(ast.argument, scope, true, ast);
        scope.returns = scope.hasOwnProperty("returns") ? ++scope.returns : 1;

        debug("ReturnStatement :", (value), (ast.argument))

        if (value.type === 'SequenceExpression') {
          ret = {
            type: 'BlockStatement',
            body: []
          };
          value.expressions.forEach(function(el, id) {
            if (id === value.expressions.length-1){
              ret.body.push(
                {
                  type: 'ReturnStatement',
                  argument: el,
                  pure: el && (el.pure || el.pured || el.purable || (el.type === "Identifier" && global_vars.indexOf(el.name) !== -1))
              });
            } else
              ret.body.push({"type": "ExpressionStatement",
            "expression": el});
          });
        } else if(value.type === 'ConditionalExpression'){ 
          /*
          rewrites 
          function e(){return a?r:g;}
          to
          function e()
            {
                if (a)
                    return r;
                else
                    return g;
            }
          */
          ret = {};
          ret.type = 'IfStatement';
          ret.test = value.test;
          ret.consequent = {
            type: 'ReturnStatement',
            argument: value.consequent
          };
          ret.alternate = {
            type: 'ReturnStatement',
            argument: value.alternate
          };
        } else if (value.type === 'BinaryExpression') {
          ret = {
            type: 'ReturnStatement',
            argument: value
          };
          ret.pure = ret.argument && (ret.argument.canPure || ret.argument.pure || ret.argument.pured || ret.argument.purable || (ret.argument.type === "Identifier" && global_vars.indexOf(ret.argument.name) !== -1));
          
        // }
        } else if (value.type === 'UnaryExpression') {
          console.log("THE RETURN STATEMENT IS A UNARY EXPRESSION IT SHOULD BE CHECKED IF ITS A PUREARG")
          ret = {
            type: 'ReturnStatement',
            argument: (value && value.pure === true) || scope.closed ? value : ast.argument
          };
        // }
        } else {
          if (value.type === "CallExpression" && value.callee.type === "FunctionDeclaration") {
            ret = ret = {
              type: 'ReturnStatement',
              // argument: (value && value.pure === true) || scope.closed ? value : ast.argument
              argument: ast.argument
            };
            ret.pure = ret.argument && (ret.argument.pure || ret.argument.pured || ret.argument.purable || (ret.argument.type === "Identifier" && global_vars.indexOf(ret.argument.name) !== -1));
          } else {
            ret = {
              type: 'ReturnStatement',
              // argument: (value && value.pure === true) || scope.closed ? value : ast.argument
              argument: value  || scope.closed ? value : ast.argument
            };
            ret.pure = ret.argument && (ret.argument.pure || ret.argument.pured || ret.argument.purable || (ret.argument.type === "Identifier" && global_vars.indexOf(ret.argument.name) !== -1));
          }
          
        }
        debug("RET PURE:", ret.pure, ret.argument === value, ret.argument === ast.argument)

        return ret;


      case 'IfStatement':
        let testReduced = ast_reduce_scoped(ast.test)
        let consequentReduced;
        let alternateReduced;
        let scopeBeforeReduce;
        if (testReduced.canPure) {
          let testResult;
          if (testReduced.value) {
            testResult = testReduced.value
          } else if (testReduced.retVal) {
            testResult = testReduced.retVal.value
          } else {
            console.log("This is an error, if it can be pure but no test result...")
          }

          // if the test can be reduce then keep one of the scope

          if (testResult) {
            // the test is positive just, reduce the alternative and then the consequent 
            scopeBeforeReduce = clonedeep(scope)
            alternateReduced = ast_reduce_scoped(ast.alternate)
            scope = clonedeep(scopeBeforeReduce)
            consequentReduced = ast_reduce_scoped(ast.consequent)
          } else {
            scopeBeforeReduce = clonedeep(scope)
            consequentReduced = ast_reduce_scoped(ast.consequent)
            scope = clonedeep(scopeBeforeReduce)
            alternateReduced = ast_reduce_scoped(ast.alternate)
          }
          
        } else if (testReduced.pure) {
          // the test is true or false just, reduce the alternative and then the consequent 
          if (testReduced.value) {
            return ast_reduce_scoped(ast.consequent)
          } else {
            return ast_reduce_scoped(ast.alternate)
          }         
        } else {
          // we cant tell if it is, just reduce both and then return it
          // We also have to remove all the variables that re-assigned or defined in both those scopes
          scopeBeforeReduce = clonedeep(scope)
          // the alt needs a fresh scope that assumes that the consequent was NOT reduced,
          let scopeBeforeReduceAlt = clonedeep(scope)

          consequentReduced = ast_reduce_scoped(ast.consequent)
          Object.keys(scope).map(k => {
            if (scopeBeforeReduce[k]) {
              // this reference also existed in previous scope lets check if the value changed
              let prevScopeVal = scopeBeforeReduce[k].value
              let newScopeVal = scope[k].value
              if (!isEqual(prevScopeVal, newScopeVal)) {
                scopeBeforeReduce[k].changed = true
              }
            }
          })
          scope = clonedeep(scopeBeforeReduceAlt)
          alternateReduced = ast_reduce_scoped(ast.alternate)
          Object.keys(scope).map(k => {
            if (scopeBeforeReduce[k]) {
              // this reference also existed in previous scope lets check if the value changed
              let prevScopeVal = scopeBeforeReduce[k]
              let newScopeVal = scope[k]
              if (!isEqual(prevScopeVal, newScopeVal)) {
                // the value changed in the reduced scope, lets mark it as tainted so whenever the scope uses this value, dont reduce it
                scopeBeforeReduce[k].changed = true
              }
            }
          })
          taintedScope = clonedeep(scopeBeforeReduce)
        }
       
        ret = {
          type: 'IfStatement',
          test: testReduced, //Expand or Not?Lookahead?
          consequent: consequentReduced,
          alternate: alternateReduced,
          pure: testReduced.canPure || testReduced.pure
        };
        return ret;


      case 'DoWhileStatement':
      case 'WhileStatement':
        // ++inLoop;
        ret = {
          type: ast.type,
          /*Error.. should be considered if Not dependent by the cycle or not? 
           body: ast_reduce_scoped(ast.body) */
          inlineBody: [],
        };
        let whiletestReduced = ast_reduce(ast.test, scope, false, ast)

        if (whiletestReduced.body) {
          ret.inlineBody = whiletestReduced.body
        }
        ret.test = whiletestReduced // Expand or Not?Lookahead?

        let whileBody =  ast_reduce(ast.body, scope, false, ast) 
        if (whileBody.type === 'BreakStatement') {
          // its justa  break as body, reduce as just the test
          whiletestReduced.inlineBody = ret.inlineBody 
          return whiletestReduced
        }

        // --inLoop;
        return ret;

      case 'ForStatement':

        ++inLoop;
        ret = {
          type: ast.type,
          init: ast_reduce_scoped(ast.init),
          test: ast_reduce(ast.test, scope, false, ast), //Expand or Not?Lookahead?
          update: ast_reduce_scoped(ast.update),
          // body: ast_reduce_scoped(ast.body)
          body: ast_reduce(ast.body, scope, false, ast)
        };
        --inLoop;
        return ret;

      case 'ForInStatement':
        return {
          type: ast.type,
          left: ast.left,
          right: ast_reduce(ast.right, scope, false, ast), //Expand or Not?Lookahead?
          body: ast_reduce_scoped(ast.body)
        };

      case 'BreakStatement':

      case 'ContinueStatement':
        return {
          type: ast.type,
          label: ast.label
        };

      case 'EmptyStatement':
        return {
          type: ast.type
        };

      case 'ThisExpression':
        debug("This Exp!", ast, scope);
        scope['.uses_this'] = true;
        //is in Function? isGlobal? is Binded? 
        /** 
         * Returns the "this Object".
         * @param  {[type]} scope [description]
         * @return {[type]}       [description]
         */
        if (scope === gscope) { //Missing this called by GlobalScope
          return scope[EXP_THIS_OBJ].value;
        } else
          return {
            type: ast.type
          };

      case 'ConditionalExpression': // a?b:c
        let test = ast_reduce_scoped(ast.test) //Expand or Not? Lookahead?
        ret = {
          type: ast.type,
          canbetransformed: ast.canbetransformed || parent.canbetransformed,
          test: test, //Expand or Not? Lookahead?
        };

        if ((parent.type === 'ExpressionStatement' && ast === parent.expression )
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          // OR is the child of another ConditionalExpression 
        // OR is the child of another ConditionalExpression 
          || (parent.type === 'ConditionalExpression' && ast !== parent.test && ret.canbetransformed)
        ) {
          ret.type = 'IfStatement';
        } else {
          ret.type = ast.type;
        }
        if (ret.test.pure) {
          if (ret.test.value && ret.consequent.pure) {
            return mkliteral(ret.consequent.value);
          }
          if (!ret.test.value && ret.alternate.pure) {
            return mkliteral(ret.alternate.value);
          }
        }
        return ret;

      case 'NewExpression':
        ret = {
          type: ast.type,
          callee: ast_reduce_scoped(ast.callee, true),
          arguments: ast.arguments.map(e => ast_reduce_scoped(e, true))
        };
        ret.purearg = ret.arguments.every(function(e) {
          return e.pure || e.simpleType;
        });

        if (match(ret.callee, {
            type: "Identifier",
            name: "Function"
          }) && ret.purearg) {
          ret = ast_reduce({
            type: "ExpressionStatement",
            expression: {
              type: "CallExpression",
              callee: ret.callee,
              arguments: ret.arguments
            },
            arguments: []
          }, scope, expandvars, ast)

        }
        if (match(ret.callee, {
            type: "Identifier",
            name: "Array"
          }) && ret.purearg) {
          ret = {
            "type": "ExpressionStatement",
            "expression": {
              "type": "ArrayExpression",
              "elements": []
            }
          };

        }
        if (match(ret.callee, {
            type: 'Identifier',
            name: 'Boolean'
          }) && ret.purearg) {
          value = Boolean.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }
        // RegExp(X) > /X/i
        if (match(ret.callee, {
            type: 'Identifier',
            name: 'RegExp'
          }) && ret.purearg) {
          value = RegExp.apply(null,
            ret.arguments.map(getValue));
          return mkliteral(value);
        }
        if (match(ret.callee, {
            type: "Identifier",
            name: "Date"
          }) && ret.purearg && ret.arguments.length === 0) {
          ret.retVal2 = new Date();
        }
        return ret;

      case 'SequenceExpression':
        ret = {
          type: ast.type,
          expressions: ast.expressions.map(ast_reduce_scoped)
        };

        if(parent.type === 'BlockStatement'){
          console.log(parent);
        }
        return ret;
      case 'UpdateExpression':
        arg = ast_reduce_scoped(ast.argument);
        debug('UpdateExpression', arg, ast.argument)
        if (inLoop) return ast;
        if (ast.argument.type === "Identifier" || arg.type === "Identifier") {
          valFromScope = false
          if (ast.argument.name in scope)
            valFromScope = findScope(ast.argument.name, scope).value
          if (arg.name in scope)
            valFromScope = findScope(arg.name, scope).value
          debug("valFromScope", valFromScope)
          if (valFromScope) {
            if (ast.prefix) {
              if (valFromScope.value && valFromScope.value.value) {
                valFromScope.value = uoperators[ast.operator](valFromScope.value.value)
              } else {
                valFromScope.value = uoperators[ast.operator](valFromScope.value)
              }
              
              value = valFromScope.value;
              debug(scope)
              return mkliteral(value);
            } else {
              // cast to int
              _tmp = +valFromScope.value;
              valFromScope.value = uoperators[ast.operator](valFromScope.value)
              value = valFromScope.value;
              debug(scope);
              return mkliteral(_tmp);
            }
          }
        }
        return {
          type: ast.type,
          operator: ast.operator,
          argument: arg, //ast_reduce(ast.argument, scope, false,ast),
          prefix: ast.prefix
        };

      case 'TryStatement':
        return {
          type: ast.type,
          block: ast_reduce_scoped(ast.block),
          guardedHandlers: ast.guardedHandlers ? ast.guardedHandlers.map(ast_reduce_scoped) : undefined,
          // handlers: ast.handlers ? ast.handlers.map(ast_reduce_scoped) : undefined,
          handler: ast.handler,
          finalizer: ast.finalizer,
          finalizer: ast_reduce_scoped(ast.finalizer),
        };

      case 'CatchClause':
        return {
          type: ast.type,
          param: ast.param,
          // body: ast_reduce_scoped(ast.body)
          body: ast.body
        };

      case 'ThrowStatement':
        return {
          type: ast.type,
          // argument: ast_reduce_scoped(ast.argument)
          argument: ast.argument
        };

      case 'LabeledStatement':
        return {
          type: ast.type,
          label: ast.label,
          body: ast_reduce_scoped(ast.body)
        };

      case 'SwitchStatement':
        return ast;

      case 'WithStatement': //TODO: Sets this to argument.
        return ast;

      case 'TaggedTemplateExpression':
         ret = {
          type: "TaggedTemplateExpression",
          tag: ast_reduce_scoped(ast.tag),
          quasi: ast_reduce_scoped(ast.quasi)
         }
         _tmp = ast_reduce_scoped({
              type: "CallExpression",
              callee: ret.tag,
              arguments: [ret.quasi]
            });
        if(_tmp.type === 'CallExpression')
          return ret;
        else
          return _tmp;
       break;
 
      case 'TemplateLiteral':
        // It's the argument of a taggedTemplateExpression 
        if (parent.quasi && parent.quasi === ast) {
          // We need to keep the Template Literal
          // to keep the original behavior of the taggedTemplateExpression
          // but we reduce all the 
          ast.quasis.forEach(function(el, id) {
            if (el.value.cooked) {
              el.value.raw = el.value.cooked;
            }
            if (!el.tail) {
              ast.expressions[id] = ast_reduce_scoped(ast.expressions[id]);
            }
          });
          return ast;
        } else {
          //else we transform it as a string concat.
          //Some part inspired by https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-template-literals/src/index.js
          //TODO: complete implementation for: https://github.com/babel/babel/pull/5791
          _tmp = [mkliteral("")];
          _trv = ast.expressions.slice(0);
          ast.quasis.forEach(function(el, id) {
            if (el.value.cooked) {
              _tmp.push(mkliteral(el.value.cooked));
            }
            if (!el.tail) {
              _tmp.push(ast_reduce_scoped(_trv[id]));
            }
          });
          ret = {
            type: "BinaryExpression",
            left: {},
            operator: '+',
            right: _tmp.pop()
          }
          _trv = ret;
          while (_tmp.length) {
            if (_tmp.length === 1) {
              _trv.left = _tmp.pop();
            } else {
              _trv.left = {
                type: "BinaryExpression",
                left: {},
                operator: '+',
                right: _tmp.pop()
              }
            }
            _trv = _trv.left;
          }
          return ast_reduce_scoped(ret);
        }
        break;

        // TODO: 

      case 'AwaitExpression':
      case 'ClassBody':
      case 'ClassDeclaration':
      case 'ClassExpression':
      case 'DebuggerStatement':
      case 'ExportAllDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportSpecifier':
      case 'ForOfStatement':
      case 'ImportDeclaration':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
      case 'ImportSpecifier':
      case 'MetaProperty':
      case 'MethodDefinition':
      case 'ObjectPattern':
      case 'Property':
      case 'RestElement':
      case 'SpreadElement':
      case 'Super':
      case 'SwitchCase':
      case 'TaggedTemplateExpression':
      case 'TemplateElement':
      case 'TemplateLiteral':
      case 'YieldExpression':
        return ast;
      default:
        console.log('unknown expression type: ' + ast.type);
        return ast;
    }
  }
  return {
    deobfuscate: ast_reduce,
    init: init,
    scopes: scopes
  };
})();
module.exports = jstiller
