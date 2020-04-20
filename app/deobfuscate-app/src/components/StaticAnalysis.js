import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { Controlled as CodeMirror } from 'react-codemirror2'
import { connect } from 'react-redux'
import { setStaticCode, setCodeTree, setFunctionNames, setSelectedFunctions, setShowDiff } from '../actions'
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';

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
    height: 700
  },
  formControl: {
    // margin: theme.spacing(1),
    minWidth: 120,
    maxWidth: 300,
  },
}));

function StaticAnalysis (props) {
  const { value, index, code, setCode, codeTree, setCodeTree, setShowDiff, setFunctionNames, diff } = props;
  const classes = useStyles();
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
      const resultCode = json.source ? json.source : code
      const codeTreeString  = json.codeTree? json.codeTree: JSON.stringify(codeTree)
      const functionNames  = json.functionNames? json.functionNames: []
      // console.log(codeTreeString)
      const codeTreeNew = JSON.parse(codeTreeString)
      // const treeParsed= tree.parse(codeTreeNew)
      setCode(resultCode);
      setCodeTree(codeTreeNew)
      setFunctionNames(functionNames)

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
            // selection={{
            //   ranges: [{
            //     anchor: {ch: 8, line: 5},
            //     head: {ch: 37, line: 5}
            //   }],
            //   focus: true // defaults false if not specified
            // }}
            // onSelection={(editor, data) => {
            //   console.log(editor)
            //   console.log(data)
            // }}
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
  const { staticCode, codeTree,  functionNames, selectedFunctionNames} = state.deobfuscation
  return ({
    code: staticCode,
    codeTree: codeTree,
    allFunctionNames: functionNames,
    selectedFunctionNames: selectedFunctionNames
  })
}

const mapDispatchToProps = dispatch => ({
  setCode: (code) => dispatch(setStaticCode(code)),
  setShowDiff: () => dispatch(setShowDiff()),
  setCodeTree: (tree)=> dispatch(setCodeTree(tree)),
  setFunctionNames: (functionNames) => dispatch(setFunctionNames(functionNames)),
  handleFunctionSelect: (event) => dispatch(setSelectedFunctions(event))
})

export default connect(mapStateToProps, mapDispatchToProps)(StaticAnalysis)