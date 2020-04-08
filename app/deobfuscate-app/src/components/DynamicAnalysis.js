import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
import Editor from 'react-simple-code-editor';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
// import { formatVariable } from '../helper'
import { setDynamicCode, setDetails,  setExecutionLog } from '../actions'
import { connect } from 'react-redux'

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

function DynamicAnalysis (props) {
  const { value, index, code, details, executionLog, setCode, setExecutionLog, setDetails } = props;

  const classes = useStyles();
  // const [code, setCode] = useState(initCode)
  // const [executionLog, setExecutionLog] = useState()
  // const [details, setDetails] = useState(false)

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

const mapStateToProps = state => {
  const {dynamicCode, details, executionLog} = state.deobfuscation
  return ({
    code: dynamicCode,
    details: details,
    executionLog: executionLog
  })
}

const mapDispatchToProps = dispatch => ({
  setCode: (code) => dispatch(setDynamicCode(code)),
  setExecutionLog: (code) => dispatch(setExecutionLog(code)),
  setDetails: () => dispatch(setDetails())
})

export default connect(mapStateToProps, mapDispatchToProps)(DynamicAnalysis)