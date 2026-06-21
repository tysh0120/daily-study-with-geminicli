# 課題：複数の例外をまとめて呼び出し元に送出する

処理中に発生した複数の例外を、呼び出し元にまとめて送出し、適切にハンドリングする実装を行ってください。

## 要件

以下の疑似的な処理を行う関数を実装してください。
- 引数 `items`（整数のリスト）を受け取る。
- 各 `item` に対して以下の処理を行う：
  - `item` が偶数の場合： `ValueError(f"Invalid even number: {item}")` を発生させる。
  - `item` が負数の場合： `TypeError(f"Negative number not allowed: {item}")` を発生させる。
  - それ以外の奇数の場合： 正常処理とし、2倍にした値を返す。
- 処理中に例外が発生しても途中で止めず、**すべての `items` を処理し終えた後**に、発生したすべての例外をまとめて呼び出し元に送出（raise）する。

### タスク1: カスタム例外による実装 (Python 3.11未満対応)
- 発生した例外のリストを保持するカスタム例外クラス `MultipleErrors` を定義してください。
- `process_items_custom(items)` を実装し、エラーがある場合は `MultipleErrors` を raise してください。
- 呼び出し元で `MultipleErrors` をキャッチし、内包されている各エラーのメッセージを出力してください。

### タスク2: `ExceptionGroup` による実装 (Python 3.11以上)
- Python 3.11 の標準機能である `ExceptionGroup` を使用して、発生した例外をグループ化して raise してください。
- `process_items_group(items)` を実装してください。
- 呼び出し元で、`except*` 構文を使用して `ValueError` と `TypeError` をそれぞれ個別にキャッチし、処理するコードを書いてください。
