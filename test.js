// test.js
function calculate(a, b) {
  // 変数名が適当
  // 未使用の変数がある
  const unused = 10;
  
  // マジックナンバー
  if (a == 100) {
    return "Perfect";
  }

  // 型に厳密でない比較
  return a + b
}

console.log(calculate(10, 20));
console.log(calculate(10, 20));