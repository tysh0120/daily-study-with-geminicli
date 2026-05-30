r"""
【今日のテーマ】
Python: typing.Protocol と Generic を活用した「静的ダックタイピング」

【課題：拡張可能なデータバリデータ・フレームワークを作ってみよう】
継承（ABC）を使わずに、構造（インターフェース）だけで型を保証する、モダンで型安全なバリデーションライブラリのプロトタ
イプを作成してください。

要件
 1. インターフェース定義: Validator[T] というジェネリックな Protocol を作成してください。
    - validate(self, value: T) -> bool メソッドを持つこと。
 2. 具体的なバリデータの実装:
    - IntRangeValidator: 数値が指定された範囲内にあるかチェックする。
    - StringRegexValidator: 文字列が正規表現にマッチするかチェックする。
 3. バリデータの合成:
    - AllPassValidator[T]: 複数のバリデータを保持し、全てがパスするかをチェックする（AND条件）。
 4. 型安全性の検証:
    - T の型が不一致なバリデータを合成しようとしたときに、エディタ（PyCharm/VSCode +
      Pyright/mypy）が警告を出すような設計にしてください。

ゴール
以下のような使い方ができること。

 1 # 整数バリデータ
 2 age_v = IntRangeValidator(0, 150)
 3 # 文字列バリデータ
 4 email_v = StringRegexValidator(r'^\S+@\S+\.\S+$')
 5
 6 # 合成（同じ型のものだけまとめられるように）
 7 validators: AllPassValidator[int] = AllPassValidator([age_v])
"""

from typing import Generic, TypeVar, Protocol, Sequence
import re


class Validator[T](Protocol):

    def validate(self, value: T):
        pass


class IntRangeValidator[int]:
    def __init__(self, lower: int, upper: int):
        self._lower: int = lower
        self._upper: int = upper

    def validate(self, value: int) -> bool:
        if value < self._lower or self._upper < value:
            return False
        else:
            return True


class StringValidator[str]:
    def __init__(self, pattern: str):
        self._pattern = re.compile(pattern)

    def validate(self, value: str) -> bool:
        return not not self._pattern.match(value)


class AllPassValidator[T]:
    def __init__(self, validators: Sequence[T]):
        self._validators = validators

    def validate(self, value: Sequence[T]) -> bool:
        return all([validator.validate(value) for validator in self._validators])


str_validator = StringValidator(".*a.*")
assert str_validator.validate("aaa")
assert not str_validator.validate("xxx")

int_range_validator = IntRangeValidator(1, 10)
assert int_range_validator.validate(1)
assert int_range_validator.validate(5)
assert int_range_validator.validate(10)
assert not int_range_validator.validate(11)

int_validators = AllPassValidator([IntRangeValidator(1, 7), IntRangeValidator(5, 10)])
assert not int_validators.validate(1)
assert int_validators.validate(5)
assert int_validators.validate(7)
assert not int_validators.validate(10)

str_validators = AllPassValidator([StringValidator(".*a.*"), StringValidator(".*b.*")])
assert str_validators.validate("ab")
assert not str_validators.validate("a")
assert not str_validators.validate("b")
assert str_validators.validate("xxaxxbxx")

"""
 AllPassValidator を完成させるためのポイントと、いくつか修正が必要な箇所（特にジェネリクスの解釈）を整理しました。

  修正のポイント

   1. 具体クラスの定義: class IntRangeValidator[int]: と書くと、「int
      という名前の型変数を持つジェネリックなクラス」という意味になってしまい、組み込みの int
      型が隠れて（シャドウイングされて）しまいます。特定の型専用のクラスなら [int] は不要です。
   2. AllPassValidator の型定義:
       * 保持するのは「値のリスト（Sequence[T]）」ではなく「バリデータのリスト（Sequence[Validator[T]]）」です。
       * validate メソッドが受け取るのは、リストではなく「チェックしたい値そのもの（value: T）」です。

  修正案（AllPassValidator 部分）

   1 class AllPassValidator[T]:
   2     # T型のバリデータを複数受け取る
   3     def __init__(self, validators: Sequence[Validator[T]]):
   4         self._validators = validators
   5
   6     # T型の値を1つ受け取って、全てのバリデータに通す
   7     def validate(self, value: T) -> bool:
   8         return all(validator.validate(value) for validator in self._validators)

  全体のレビュー

  ┌────────┬──────┬────────────────────────────────────────────────────────────┐
  │ 観点   │ 評価 │ コメント                                                   │
  ├────────┼──────┼────────────────────────────────────────────────────────────┤
  │ 正確性 │ △    │ AllPassValidator の引数と [int] の構文に誤解がありました。 │
  │ 可読性 │ 〇   │ 簡潔で分かりやすいです。                                   │
  │ 効率性 │ 〇   │ all() を使った実装は Pythonic で効率的です。               │
  └────────┴──────┴────────────────────────────────────────────────────────────┘
  ---

  ブラッシュアップのためのヒント

  今のコードを以下のように微調整してみてください。

   1. Validator[T] の validate に戻り値の型 -> bool を追加し、中身を ... にする。
   2. IntRangeValidator と StringValidator から [int] や [str] を取り除く。
   3. AllPassValidator を上記の修正案のように書き換える。

  修正したものを実行（python python/validator_framework.py）してみて、assert
  が通るか確認してみてください！型チェッカー（mypyなど）を通すと、さらにジェネリクスの恩恵が実感できます。
"""
