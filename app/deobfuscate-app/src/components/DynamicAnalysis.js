import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
import Editor from 'react-simple-code-editor';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { formatVariable } from '../helper'

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
    border: 'groove',
    display: 'inline-flex'
  }
}));

export default function DynamicAnalysis (props) {
  const { value, index } = props;

  const classes = useStyles();
  const initCode = `var _0xc8bf=['\x76\x61\x6c\x75\x65','\x73\x75\x62\x6d\x69\x74\x42\x75\x74\x74\x6f\x6e','\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72','\x63\x6c\x69\x63\x6b','\x6c\x6f\x67','\x63\x63\x6e\x75\x6d','\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'];(function(_0x52c1d3,_0x2a26eb){var _0x41df97=function(_0x2568bb){while(--_0x2568bb){_0x52c1d3['push'](_0x52c1d3['shift']());}};_0x41df97(++_0x2a26eb);}(_0xc8bf,0x141));var _0x3f6e=function(_0x52c1d3,_0x2a26eb){_0x52c1d3=_0x52c1d3-0x0;var _0x41df97=_0xc8bf[_0x52c1d3];return _0x41df97;};var submitButton=document[_0x3f6e('\x30\x78\x30')](_0x3f6e('\x30\x78\x32'));console[_0x3f6e('\x30\x78\x35')](submitButton);var cCardNum=document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'](_0x3f6e('\x30\x78\x36'));submitButton[_0x3f6e('\x30\x78\x33')](_0x3f6e('\x30\x78\x34'),()=>{alert(cCardNum[_0x3f6e('\x30\x78\x31')]);});`
  const [code, setCode] = useState(initCode)
  const [executionLog, setExecutionLog] = useState()
  const [details, setDetails] = useState(false)

  const handleClick = (code, path) => {
    fetch(`http://localhost:3001${path}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({source: code, listener:details})
    })
    .then(res => res.json())
    .then(json => {
      const executionLog = json.log
      const resultCode = json.source? json.source: code
      setCode(resultCode);
      setExecutionLog(executionLog)
    }).catch(err => {
      setCode("Error in fetch");
      throw(err)
    });
  }

  return (
    <React.Fragment>
    {(value === index) ?
      <React.Fragment>
        <Typography variant="h3" component="h2">
          Dynamic Analysis Tab
        </Typography>
        <div className={classes.editor}>
          <CodeMirror
            value={code}
            options={{
              lineNumbers: true,
              lineWrapping: true,
              mode: {name: "javascript", json: false},
            }}
            onBeforeChange={(editor, data, value) => {
              setCode(value)
            }}
            onChange={(editor, data, value) => {
              setCode(value)
            }}
          />
          <Editor
              value={executionLog}
              // onValueChange={code => setExecutionLog(code)}
              highlight={code => (code)}
              padding={10}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
              }}
            />
        </div>
        <div className={classes.buttons}>
          <Button variant="contained" color="primary" onClick={() => handleClick(code, '/dynamic')}>
            Analyse
          </Button>
          <Button variant="contained" color="primary" onClick={() => handleClick(code, '/pretty')}>
            Prettify
          </Button>
          {/* <Button variant="contained" color="primary" onClick={() => handleClick(code, '/unused')}>
            Remove Unused Variables
          </Button> */}
          <Button variant="contained" color="primary" onClick={() => handleClick(code, '/undo')}>
            Undo transformation
          </Button>
          <FormControlLabel  control={<Switch checked={details} onChange={() => setDetails(!details)} name="Details" />} label="Details" />
        </div>
      </React.Fragment>: null}
    </React.Fragment> 
  )
  
}