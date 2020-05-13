// const initCode = `
// var lyB = jQX(7, 4);
// var lyB2 = jQX(23, 56);

// function jQX(ea, b) {
//     var K = 24;
// 	var k2 = 30;
//   	var k3 = 10
//     if (ea > b){
//       K = 2;
//   	  k2 = 20
//     } else {
//       k3 = k2 + 10
//       K = 3;
//     }
     
  
//   	var x = 2 + k2
//     var y = 4 + k3

//     return K;
// }
// // this example shows K is tainted in the if branch so then unless there is a solid assignment it will not be evaluated as 
// `

const initCode = `
function R(K) {
    C(oL, T("deleteF"));
}

function T(gR) {
    return gR + "ile";
}

function C(u, Flg) {
    const ffv = WScript;
    u[Flg](WScript.ScriptFullName);
}

`


// const initCode = `
// function q(fVy)
// {
//     var GJ = 4;
//     if (true)
//     {
//             var lyB = jQX(7, 4);
//             if (lyB == false)
//                     lyB = jQX(23, 56);
//             GJ = 3;
//     }
//     return GJ;
// }


// function gT()
// {
//         var I=[];
//         I[0]="/";
//         I[1]="la";
//         I[2]="e";
//         I[3]="is";
//         I[4]="a";
//         I[5]="en";
//         I[6]="-";
//         I[7]="nt";
//         I[8]="r";
//         I[9]="s/";
//         I[10]="t";
//         I[11]="h";
//         I[12]="di";
//         I[13]=".c";
//         I[14]="he";
//         I[15]="n";
//         I[16]="c/";
//         I[17]="wp";
//         I[18]="c.";
//         I[19]="i";
//         I[20]="rd";
//         I[21]="/";
//         I[22]="ht";
//         I[23]="a";
//         I[24]="g";
//         I[25]="//";
//         I[26]="co";
//         I[27]="1";
//         I[28]="he";
//         I[29]="om";
//         I[30]="em";
//         I[31]="pa";
//         I[32]="t/";
//         I[33]=":";
//         I[34]="sp";
//         I[35]="jp";
//         I[36]="tp";
//         I[37]="l";
//         var cFh=I[22]+I[36]+I[33]+I[25]+I[28]+I[8]+I[12]+I[34]+I[23]+I[37]+I[4]+I[13]+I[29]+I[0]+I[17]+I[6]+I[26]+I[7]+I[5]+I[32]+I[10]+I[11]+I[30]+I[2]+I[9]+I[14]+I[20]+I[3]+I[31]+I[1]+I[21]+I[19]+I[15]+I[16]+I[27]+I[18]+I[35]+I[24];
//         return cFh;
// }

// function JK()
// {
//         var hL=[];
//         hL[0]="c.";
//         hL[1]="no";
//         hL[2]="/";
//         hL[3]="n";
//         hL[4]="j";
//         hL[5]="p";
//         hL[6]=":/";
//         hL[7]="i";
//         hL[8]="on";
//         hL[9]="v";
//         hL[10]=".x";
//         hL[11]="g";
//         hL[12]=".j";
//         hL[13]="/i";
//         hL[14]="tp";
//         hL[15]="ht";
//         hL[16]="t";
//         hL[17]="va";
//         hL[18]="p";
//         hL[19]="1";
//         hL[20]="sr";
//         var a=hL[15]+hL[14]+hL[6]+hL[13]+hL[3]+hL[1]+hL[17]+hL[16]+hL[7]+hL[8]+hL[10]+hL[20]+hL[9]+hL[12]+hL[5]+hL[2]+hL[19]+hL[0]+hL[4]+hL[18]+hL[11];
//         return a;
// }

// function jQX(ea, b) {
//     var K = 24;

//     if (ea > b)
//         K = JK();
//     else
//         K = gT();

//     return K;
// }
// // this example shows K is tainted in the if branch so then unless there is a solid assignment it will not be evaluated as 
// `


// const initCode = `
// function R(K) {
//     var mj = cN(42);
//     var oL = new mj("Scripting.F" + "ileSystemObjec" + k());
//     var U = 0;
//     if (124 > 89) {
//         var K = "del" + "et" + "eF";
//         C(oL, T(K));
//         return true;
//     }

//     return U;
// }

// function k()
// {
//         var n = "t";
//         return n;
// }

// function cN(N) {
//     return ActiveXObject;
// }

// function C(u, Flg) {
//     var ffv = WScript;
//     u[Flg](ffv["ScriptFullName"]);
// }

// function T(gR) {
//     return gR + "ile";
// }
// `


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