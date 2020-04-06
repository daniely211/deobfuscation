import React, { useState } from 'react';
// import { highlight, languages } from 'prismjs/components/prism-core';
import Editor from 'react-simple-code-editor';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
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
    border: 'groove'
  }
}));

export default function JSConsole (props) {
  const { value, index } = props;
  const classes = useStyles();
  const [exe, setExe] = useState('')
  const [exeResult, setExeResult] = useState('')

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
      if (json.res){
        let output = formatVariable(json.res)
        setExeResult(output)
      }
    }).catch(err => {
      setExeResult("Error in fetch");
      throw(err)
    });
  }

  return (
    <React.Fragment>
      {value === index?
        <React.Fragment>

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
      :null}
    </React.Fragment>
  )
}