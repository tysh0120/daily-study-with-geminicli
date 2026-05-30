# 今日のテーマ
Python: `typing.Protocol` と `Generic` を活用した「静的ダックタイピング」

# 課題：拡張可能なデータバリデータ・フレームワークを作ってみよう
継承（ABC）を使わずに、構造（インターフェース）だけで型を保証する、モダンで型安全なバリデーションライブラリのプロトタイプを作成してください。

### 要件
1. **インターフェース定義**: `Validator[T]` というジェネリックな `Protocol` を作成してください。
   - `validate(self, value: T) -> bool` メソッドを持つこと。
2. **具体的なバリデータの実装**:
   - `IntRangeValidator`: 数値が指定された範囲内にあるかチェックする。
   - `StringRegexValidator`: 文字列が正規表現にマッチするかチェックする。
3. **バリデータの合成**:
   - `AllPassValidator[T]`: 複数のバリデータを保持し、全てがパスするかをチェックする（AND条件）。
4. **型安全性の検証**:
   - `T` の型が不一致なバリデータを合成しようとしたときに、エディタ（PyCharm/VSCode + Pyright/mypy）が警告を出すような設計にしてください。

### ゴール
以下のような使い方ができること。

```python
# 整数バリデータ
age_v = IntRangeValidator(0, 150)
# 文字列バリデータ
email_v = StringRegexValidator(r'^\S+@\S+\.\S+$')

# 合成（同じ型のものだけまとめられるように）
validators: AllPassValidator[int] = AllPassValidator([age_v])
```
