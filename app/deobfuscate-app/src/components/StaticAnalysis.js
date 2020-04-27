import React, { useState,  } from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
import { connect } from 'react-redux'
import { setStaticCode, setCodeTree, setFunctionNames, setSelectedFunctions, setShowDiff, setOldCode } from '../actions'
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MergeCodeTextArea from './MergeCodeTextArea';

require('codemirror/lib/codemirror.css');
require('codemirror/theme/material.css');
require('codemirror/theme/neat.css');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
require('codemirror/theme/eclipse.css')
require('codemirror/addon/lint/lint.css')
require('codemirror/addon/merge/merge.css')
require('codemirror/addon/lint/lint')
require('codemirror/addon/lint/javascript-lint')
require('codemirror/addon/merge/merge')

const useStyles = makeStyles(theme => ({
  buttons: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  editor: {
    margin: '10px',
    border: 'groove',
    height: 700
  },
  formControl: {
    // margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
}));

function StaticAnalysis (props) {
  const { reMountMergeCode, value, index, code, setOldCode, setCode, codeTree, setCodeTree, setShowDiff, setFunctionNames, diff } = props;
  const classes = useStyles();

  const handleClick = (code, path) => {
    setOldCode(code);

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
      if (json.source) {
        setCode(json.source)
      }
      if (json.codeTree) {
        const codeTreeNew = JSON.parse(json.codeTree)
        setCodeTree(codeTreeNew)
      }
      if (json.functionNames) {
        setFunctionNames(json.functionNames)
      }
      

      // if (json.res){
      //   let output = formatVariable(json.res)
      //   setExeResult(output)
      // } else {
      // }
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
          Static Analysis Tabs
        </Typography>
        <div className={classes.editor}>
          {!diff?
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
                // setCode(value)
              }}
              selection={{
                // ranges: [{
                //   anchor: {ch: 8, line: 5},
                //   head: {ch: 37, line: 5}
                // }],
                // focus: true // defaults false if not specified
              }}
              // onSelection={(editor, data) => {
              //   console.log(editor)
              //   console.log(data)
              // }}
            />
          :
          <MergeCodeTextArea key={reMountMergeCode} />
          }

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
          <Button variant="contained" color="primary" onClick={() => handleClick(code, '/save')}>
            Save
          </Button>
          {/* <FormControl className={classes.formControl}>
            <InputLabel shrink >Functions</InputLabel>
            <Select
              value={selectedFunctionNames}
              onChange={handleFunctionSelect}
              multiple
              native
            >
              {allFunctionNames.map(name => (
                // <MenuItem value={name}>{name}</MenuItem>
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </FormControl> */}
          <FormControlLabel control={<Switch checked={diff} onChange={() => setShowDiff()} name="Show Changes" />} label="Show Changes" />

        </div>
      </React.Fragment>: null}
    </React.Fragment> 
  )
}

const mapStateToProps = state => {
  const { staticCode, lastCode,  codeTree,  functionNames, selectedFunctionNames, diff, reMountMergeCode} = state.deobfuscation
  return ({
    code: staticCode,
    lastCode: lastCode,
    codeTree: codeTree,
    allFunctionNames: functionNames,
    selectedFunctionNames: selectedFunctionNames,
    diff: diff,
    reMountMergeCode: reMountMergeCode
  })
}

const mapDispatchToProps = dispatch => ({
  setOldCode: (code) => dispatch(setOldCode(code)),
  setCode: (code) => dispatch(setStaticCode(code)),
  setShowDiff: () => dispatch(setShowDiff()),
  setCodeTree: (tree)=> dispatch(setCodeTree(tree)),
  setFunctionNames: (functionNames) => dispatch(setFunctionNames(functionNames)),
  handleFunctionSelect: (event) => dispatch(setSelectedFunctions(event))
})

export default connect(mapStateToProps, mapDispatchToProps)(StaticAnalysis)