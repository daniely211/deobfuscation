import React, { Component } from 'react'
import CodeMirror, { MergeView } from 'codemirror/lib/codemirror'
import { connect } from 'react-redux'
import { setStaticCode } from '../actions'

require('codemirror/lib/codemirror.css');
require('codemirror/theme/eclipse.css')
require('codemirror/theme/neat.css')
require('codemirror/addon/lint/lint.css')
require('codemirror/addon/merge/merge.css')
require('codemirror/mode/javascript/javascript')
require('codemirror/addon/lint/lint')
require('codemirror/addon/lint/javascript-lint')
require('codemirror/addon/merge/merge')


class MergeCodeTextArea extends Component{
  constructor(props){
    super(props)
    this._ref = React.createRef();
  }

  componentDidMount(){
    const { language='javascript',theme="eclipse",lineNumbers=true } = this.props
    const dv = CodeMirror.MergeView(this._ref, {
      theme: theme,
      value: this.props.code,
      origLeft: null,
      origRight: this.props.lastCode,
      allowEditingOriginals: true,
      lineNumbers: lineNumbers,
      mode: language,
      highlightDifferences: true,
      gutters: ['CodeMirror-lint-markers'],
      lint: true,
      connect: 'align',
      onBeforeChange: (editor, data, value) => {
        this.props.setCode(value)
      }
    })
  }


  render(){
    return (
      <div ref={ref=>this._ref=ref}></div>
    )
  }
  
}

const mapStateToProps = state => {
    const { staticCode, lastCode, reMountMergeCode } = state.deobfuscation
    return ({
      code: staticCode,
      lastCode: lastCode,
      reMountMergeCode: reMountMergeCode,
    })
}

const mapDispatchToProps = dispatch => ({
  setCode: (code) => dispatch(setStaticCode(code)),
})

  export default connect(mapStateToProps, mapDispatchToProps)(MergeCodeTextArea)