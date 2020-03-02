// useful libray function
function convertGBPtoUSD(amount) {
  // return fx.convert(amount, {from: "GBP", to: "HKD"});
}

// malicious code that attempts to steal card details
const submitButton = document['getElementById']('submitButton');
const cCardNum = document['getElementById']('ccnum');
submitButton.addEventListener("click", () => {alert(cCardNum.value)}); 
