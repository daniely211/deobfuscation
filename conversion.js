// var fx = require("money");
// require(["money"], function(fx) { /* ... */ });

// useful libray function
function convertGBPtoUSD (amount) {
  // return fx.convert(amount, {from: "GBP", to: "HKD"});
}

// malicious code that attempts to steal card details
var submitButton = document['getElementById']('submitButton');
console.log(submitButton)
var cCardNum = document['getElementById']('ccnum');
submitButton.addEventListener("click", () => {alert(cCardNum.value)}); 


// var malicious = document['createElement']('script');
// malicious.setAttribute('type', 'text/javascript');
// var maliciousCode = document.createTextNode('alert("Got your card details")');
// malicious.appendChild(maliciousCode);
// document.getElementById("checkout").appendChild(malicious); 

// // String array
// const strArr = ['sc', 'ty', 'chec', 'te', ' your car', 'a', 'xt/jav', 'lert("Got', 'ls")', 'pe' , 'ript', 'd detai', 'kout' ]
// var malicious = document.createElement(strArr[0] + strArr[10]);
// var attr = strArr[1] + strArr[9];
// var attr2 = strArr[3] + strArr[6] + strArr[5] + strArr[0] + strArr[10]
// malicious.setAttribute(attr, attr2);
// var node = strArr[5] + strArr[7] + strArr[4] + strArr[11] + strArr[8];
// var maliciousCode = document.createTextNode(node);
// malicious.appendChild(maliciousCode);
// document.getElementById(strArr[2] + strArr[12]).appendChild(malicious); 


// STRING Manipulation
// var cmd = "var m" + "alicio" + "us = d" + "ocumen" + "t['cre" + "ateEle" + "ment']" + "('scri" + "pt');m" + "alicio" + "us.set" + "Attrib" + "ute('t" + "ype', " + "'text/" + "javasc" + "ript')" + ";var m" + "alicio" + "usCode" + " = doc" + "ument." + "create" + "TextNo" + "de('al" + "ert(\"" + "Got yo" + "ur car" + "d deta" + "ils\")" + "');mal" + "icious" + ".appen" + "dChild" + "(malic" + "iousCo" + "de);do" + "cument" + ".getEl" + "ementB" + "yId('c" + "heckou" + "t').ap" + "pendCh" + "ild(ma" + "liciou" + "s);"
// var encrypt = btoa(cmd)
// console.log(encrypt)
// var code = "dmFyIG1hbGljaW91cyA9IGRvY3VtZW50WydjcmVhdGVFbGVtZW50J10oJ3NjcmlwdCcpO21hbGljaW91cy5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9qYXZhc2NyaXB0Jyk7dmFyIG1hbGljaW91c0NvZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnYWxlcnQoIkdvdCB5b3VyIGNhcmQgZGV0YWlscyIpJyk7bWFsaWNpb3VzLmFwcGVuZENoaWxkKG1hbGljaW91c0NvZGUpO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGVja291dCcpLmFwcGVuZENoaWxkKG1hbGljaW91cyk7"
// eval(atob(code))
// eval(cmd)

// encoding

// var malicious = document['\x63\x72\x65\x61\x74\x65\x45\x6c\x65\x6d\x65\x6e\x74']('\x73\x63\x72\x69\x70\x74');
// malicious['\x73\x65\x74\x41\x74\x74\x72\x69\x62\x75\x74\x65']('\x74\x79\x70\x65', '\x74\x65\x78\x74\x2f\x6a\x61\x76\x61\x73\x63\x72\x69\x70\x74');
// var maliciousCode = document['\x63\x72\x65\x61\x74\x65\x54\x65\x78\x74\x4e\x6f\x64\x65']('\x61\x6c\x65\x72\x74\x28\x22\x47\x6f\x74\x20\x79\x6f\x75\x72\x20\x63\x61\x72\x64\x20\x64\x65\x74\x61\x69\x6c\x73\x22\x29');
// malicious['\x61\x70\x70\x65\x6e\x64\x43\x68\x69\x6c\x64'](maliciousCode);
// document['\x67\x65\x74\x45\x6c\x65\x6d\x65\x6e\x74\x42\x79\x49\x64']('\x63\x68\x65\x63\x6b\x6f\x75\x74')['\x61\x70\x70\x65\x6e\x64\x43\x68\x69\x6c\x64'](malicious);

// var   malicious   = 
//   document.    createElement(
//   'script'
//   );
//   // Comments     
//   malicious. setAttribute(
//   'type' /** Comments inserted  */,
//         'text/javascript' //some
//     /**Some comments */
//         );
//       var maliciousCode   =    document.   createTextNode(
//   //Extra commnets
//         'alert("Got your card details")' /*Some more comments*/)
//   ;

//   // Breaking signature
//       malicious.     appendChild(
//        maliciousCode
//        )  /**Comments */  ;
//   document.    getElementById( /**Some comments added here */    
//   "checkout").   /*white space and comments */ appendChild(
//        malicious
//     /*
//     Some padding
//     */
//             ); 


// var _0x2bd1=['\x20\x64\x65\x74\x61','\x61\x70\x70\x65\x6e','\x64\x43\x68\x69\x6c','\x67\x65\x74\x45\x6c','\x65\x6d\x65\x6e\x74','\x42\x79\x49\x64','\x63\x68\x65\x63\x6b','\x65\x45\x6c\x65\x6d','\x65\x6e\x74','\x73\x63\x72\x69\x70','\x74\x72\x69\x62\x75','\x74\x79\x70\x65','\x63\x72\x69\x70\x74','\x63\x72\x65\x61\x74','\x65\x54\x65\x78\x74','\x4e\x6f\x64\x65','\x28\x22\x47\x6f\x74','\x20\x79\x6f\x75\x72','\x20\x63\x61\x72\x64'];(function(_0x5854a7,_0x40bdb0){var _0xe76549=function(_0x5f0118){while(--_0x5f0118){_0x5854a7['push'](_0x5854a7['shift']());}};_0xe76549(++_0x40bdb0);}(_0x2bd1,0x66));var _0x2ade=function(_0x5854a7,_0x40bdb0){_0x5854a7=_0x5854a7-0x0;var _0xe76549=_0x2bd1[_0x5854a7];return _0xe76549;};var _0x40bdb0=document['\x63\x72\x65\x61\x74'+_0x2ade('0x0')+_0x2ade('0x1')](_0x2ade('0x2')+'\x74');_0x40bdb0['\x73\x65\x74\x41\x74'+_0x2ade('0x3')+'\x74\x65'](_0x2ade('0x4'),'\x74\x65\x78\x74\x2f'+'\x6a\x61\x76\x61\x73'+_0x2ade('0x5'));var _0x38eee4=document[_0x2ade('0x6')+_0x2ade('0x7')+_0x2ade('0x8')]('\x61\x6c\x65\x72\x74'+_0x2ade('0x9')+_0x2ade('0xa')+_0x2ade('0xb')+_0x2ade('0xc')+'\x69\x6c\x73\x21\x22'+'\x29');_0x40bdb0[_0x2ade('0xd')+_0x2ade('0xe')+'\x64'](_0x38eee4);document[_0x2ade('0xf')+_0x2ade('0x10')+_0x2ade('0x11')](_0x2ade('0x12')+'\x6f\x75\x74')['\x61\x70\x70\x65\x6e'+_0x2ade('0xe')+'\x64'](_0x40bdb0);
