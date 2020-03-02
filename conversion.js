// useful libray function
function convertGBPtoUSD(amount) {
  // return fx.convert(amount, {from: "GBP", to: "HKD"});
}

// malicious code that attempts to steal card details
const submitButton = document['getElementById']('submitButton');
const cCardNum = document['getElementById']('ccnum');
submitButton.addEventListener("click", () => {alert(cCardNum.value)}); 

// const cmd = "const" + " subm" + "itBut" + "ton =" + " docu" + "ment[" + "'getE" + "lemen" + "tById" + "']('s" + "ubmit" + "Butto" + "n');c" + "onst " + "cCard" + "Num =" + " docu" + "ment[" + "'getE" + "lemen" + "tById" + "']('c" + "cnum'" + ");sub" + "mitBu" + "tton." + "addEv" + "entLi" + "stene" + "r('cl" + "ick'," + " () =" + "> {al" + "ert(c" + "CardN" + "um.va" + "lue)}" + "); "
// eval(cmd)
// Iden Mangling
// const _0x2179ac = document['getElementById']('submitButton');
// const _0x475631 = document['getElementById']('ccnum');
// _0x2179ac.addEventListener("click", () => {alert(_0x475631.value)}); 

// // String array
const strArr = ['tButton', 'getEle', 'cli', 'submi', 'mentById', 'um','ck','ccn']
const submitButton = document[strArr[1] + strArr[4]](strArr[3] + strArr[0]);
const cCardNum = document[strArr[1] + strArr[4]](strArr[7] + strArr[5]);
submitButton.addEventListener(strArr[2] + strArr[6], () => {alert(cCardNum.value)}); 


// STRING Manipulation
// var cmd = "var m" + "alicio" + "us = d" + "ocumen" + "t['cre" + "ateEle" + "ment']" + "('scri" + "pt');m" + "alicio" + "us.set" + "Attrib" + "ute('t" + "ype', " + "'text/" + "javasc" + "ript')" + ";var m" + "alicio" + "usCode" + " = doc" + "ument." + "create" + "TextNo" + "de('al" + "ert(\"" + "Got yo" + "ur car" + "d deta" + "ils\")" + "');mal" + "icious" + ".appen" + "dChild" + "(malic" + "iousCo" + "de);do" + "cument" + ".getEl" + "ementB" + "yId('c" + "heckou" + "t').ap" + "pendCh" + "ild(ma" + "liciou" + "s);"
// var encrypt = btoa(cmd)
// console.log(encrypt)
// var code = "dmFyIG1hbGljaW91cyA9IGRvY3VtZW50WydjcmVhdGVFbGVtZW50J10oJ3NjcmlwdCcpO21hbGljaW91cy5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9qYXZhc2NyaXB0Jyk7dmFyIG1hbGljaW91c0NvZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnYWxlcnQoIkdvdCB5b3VyIGNhcmQgZGV0YWlscyIpJyk7bWFsaWNpb3VzLmFwcGVuZENoaWxkKG1hbGljaW91c0NvZGUpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGVja291dCcpLmFwcGVuZENoaWxkKG1hbGljaW91cyk7"
// eval(atob(code))

// ENCRYPTION
// var code = "dmFyIHN1Ym1pdEJ1dHRvbiA9IGRvY3VtZW50WydnZXRFbGVtZW50QnlJZCddKCdzdWJtaXRCdXR0b24nKTtjb25zb2xlLmxvZyhzdWJtaXRCdXR0b24pO3ZhciBjQ2FyZE51bSA9IGRvY3VtZW50WydnZXRFbGVtZW50QnlJZCddKCdjY251bScpO3N1Ym1pdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHthbGVydChjQ2FyZE51bS52YWx1ZSl9KTs="
// eval(atob(code))
// eval(cmd)


// encoding
// const submitButton = document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64']('\x73\x75\x62\x6d\x69\x74\x42\x75\x74\x74\x6f\x6e');
// console['\x6c\x6f\x67'](submitButton);
// const cCardNum = document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64']('\x63\x63\x6e\x75\x6d');
// submitButton['\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72']('\x63\x6c\x69\x63\x6b', () => {
//     alert(cCardNum['\x76\x61\x6c\x75\x65']);
// });

// White space and comments
// const submitButton  /**Comments */
//   =    document /*whitespace*/ 
//   [  'getElementById']   /** More comments */ (
//     'submitButton'
//     );
//     const   cCardNum =  
// //Some new lines here


//   document['getElementById']  /** Comments */   ('ccnum');
//             submitButton   /** Comments */    .addEventListener("click"
// ,
// ()=>
// {alert
//   ( /**Comments */      cCardNum.value  )}); 


// OBfuscat io
// var _0xc8bf=['\x76\x61\x6c\x75\x65','\x73\x75\x62\x6d\x69\x74\x42\x75\x74\x74\x6f\x6e','\x61\x64\x64\x45\x76\x65\x6e\x74\x4c\x69\x73\x74\x65\x6e\x65\x72','\x63\x6c\x69\x63\x6b','\x6c\x6f\x67','\x63\x63\x6e\x75\x6d','\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'];(function(_0x52c1d3,_0x2a26eb){var _0x41df97=function(_0x2568bb){while(--_0x2568bb){_0x52c1d3['push'](_0x52c1d3['shift']());}};_0x41df97(++_0x2a26eb);}(_0xc8bf,0x141));var _0x3f6e=function(_0x52c1d3,_0x2a26eb){_0x52c1d3=_0x52c1d3-0x0;var _0x41df97=_0xc8bf[_0x52c1d3];return _0x41df97;};var submitButton=document[_0x3f6e('\x30\x78\x30')](_0x3f6e('\x30\x78\x32'));console[_0x3f6e('\x30\x78\x35')](submitButton);var cCardNum=document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64'](_0x3f6e('\x30\x78\x36'));submitButton[_0x3f6e('\x30\x78\x33')](_0x3f6e('\x30\x78\x34'),()=>{alert(cCardNum[_0x3f6e('\x30\x78\x31')]);});