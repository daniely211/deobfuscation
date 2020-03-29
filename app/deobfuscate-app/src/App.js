import React, { useState, useEffect } from 'react';
import './App.css';
import { highlight, languages } from 'prismjs/components/prism-core';
import Editor from 'react-simple-code-editor';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
require('codemirror/lib/codemirror.css');
require('codemirror/theme/material.css');
require('codemirror/theme/neat.css');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');

const useStyles = makeStyles(theme => ({
  buttons: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  editor: {
    margin: '10px',
    border: 'groove'
  }
}));

function App() {
  const classes = useStyles();
  const initCode = `var _0xc8bf=['\x76\x61\x6c\x75\x65','\x73\x75\x62\x6d\x69\x74\x42\x75\x74\x74\x6f\x6e','\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72','\x63\x6c\x69\x63\x6b','\x6c\x6f\x67','\x63\x63\x6e\x75\x6d','\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'];(function(_0x52c1d3,_0x2a26eb){var _0x41df97=function(_0x2568bb){while(--_0x2568bb){_0x52c1d3['push'](_0x52c1d3['shift']());}};_0x41df97(++_0x2a26eb);}(_0xc8bf,0x141));var _0x3f6e=function(_0x52c1d3,_0x2a26eb){_0x52c1d3=_0x52c1d3-0x0;var _0x41df97=_0xc8bf[_0x52c1d3];return _0x41df97;};var submitButton=document[_0x3f6e('\x30\x78\x30')](_0x3f6e('\x30\x78\x32'));console[_0x3f6e('\x30\x78\x35')](submitButton);var cCardNum=document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'](_0x3f6e('\x30\x78\x36'));submitButton[_0x3f6e('\x30\x78\x33')](_0x3f6e('\x30\x78\x34'),()=>{alert(cCardNum[_0x3f6e('\x30\x78\x31')]);});`
  const [code, setCode] = useState(initCode)
  const [exe, setExe] = useState('')
  const [exeResult, setExeResult] = useState('')

  const refreshHandler = (e) => {
    // if((e.keyCode === 90 && e.ctrlKey) || (e.metaKey && e.keyCode===90)) {
    //   handleClick(code, '/undo')
    // }

    if((e.metaKey && e.keyCode===82)) {
      // if (window.confirm("Your work will be gone if you refresh")){
      //   window.location.reload()
      // }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', refreshHandler);
    // Specify how to clean up after this effect:
    return function cleanup() {
      document.removeEventListener('keydown', refreshHandler);
    };
  });

  const formatVariable = (v) => {
    
    if (typeof v === 'string' || v instanceof String) {
      return `"${v}"`
    }
    if (Array.isArray(v)) {
      // console.log("is arry")
      
      let elems = v.map(e => {
        // console.log(e)
        return formatVariable(e)
      })
      elems = elems.join(',')
      return `[${elems}]`
    }
    return v
  }


  const handleClick = (code, path) => {
    fetch(`http://localhost:3001${path}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: code,
      })
    })
    .then(res => res.json())
    .then(json => {
      const resultCode = json.source? json.source: code
      if (json.res){
        let output = formatVariable(json.res)
        setExeResult(output)
      } else {
        setCode(resultCode);
      }
    }).catch(err => {
      setCode("Error in fetch");
      throw(err)
    });
  }

  return (
    <React.Fragment>
      <Typography variant="h3" component="h2">
        Input
      </Typography>
      <div className={classes.editor}>
        <CodeMirror
          value={code}
          options={{
            lineNumbers: true,
            mode: {name: "javascript", json: false},
          }}
          onBeforeChange={(editor, data, value) => {
            setCode(value)
          }}
          onChange={(editor, data, value) => {
            setCode(value)
          }}
        />
      </div>
      <div className={classes.buttons}>
        <Button variant="contained" color="primary" onClick={() => handleClick(code, '/constantProp')}>
          Evaluate Constants
        </Button>
        <Button variant="contained" color="primary" onClick={() => handleClick(code, '/pretty')}>
          Prettify
        </Button>
        <Button variant="contained" color="primary" onClick={() => handleClick(code, '/unused')}>
          Remove Unused Variables
        </Button>
        <Button variant="contained" color="primary" onClick={() => handleClick(code, '/undo')}>
          Undo transformation
        </Button>
      </div>
      <Typography variant="h3" component="h2">
         Javascript Console
      </Typography>
      <div className={classes.editor}>
        <CodeMirror
          value={exe}
          options={{
            lineNumbers: true,
            mode: {name: "javascript", json: false},
          }}
          onBeforeChange={(editor, data, value) => {
            setExe(value)
          }}
          onChange={(editor, data, value) => {
            setExe(value)
          }}
        />
      </div>
      <div className={classes.buttons}>
        <Button variant="contained" color="primary" onClick={() => handleClick(exe, '/execute')}>
          Execute
        </Button>
      </div>
      <div className={classes.editor}>
        <Editor
          value={exeResult}
          onValueChange={code => setExeResult(code)}
          highlight={code => (code)}
          padding={10}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 12,
          }}
        />
      </div>
      
    </React.Fragment>
  );
}

export default App;
