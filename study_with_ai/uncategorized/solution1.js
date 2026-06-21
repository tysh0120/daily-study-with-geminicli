/*
問題：groupBy 関数の実装dd

オブジェクトの配列を、指定されたキーに基づいてグループ化する関数 groupBy を作成してください。

仕様：
- 第1引数にオブジェクトの配列を受け取ります。
- 第2引数にグループ化の基準となるキー名（文字列）を受け取ります。
- 戻り値は、各グループをキーとし、そのグループに属するオブジェクトの配列を値に持つオブジェクトを返してください。
*/

const groupBy = (arr, key) => {
    return arr.reduce((acc, item) => {
        acc[item[key]] ||= []
        acc[item[key]].push(item)
        return acc
    }, {})
}

