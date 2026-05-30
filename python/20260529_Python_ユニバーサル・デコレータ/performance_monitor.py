import functools
import time

def monitor(threshold):
    def decorator(f):
        #@functools.wraps(f)
        class Wrapper:
            def __init__(self, threshold):
                self.threshold = threshold

            def __call__(self, *args, **kwargs):
                start = time.perf_counter()
                result = f(*args, **kwargs)
                end = time.perf_counter()
                if end - start > self.threshold:
                    print(f"警告: {self.threshold}s を超えた")
                return result

            def set_threshold(self, threshold):
                self.threshold = threshold

        return Wrapper(threshold)
    return decorator

@monitor(1)
def heavy_task(wait):
    """ これは重たい仕事です """
    time.sleep(wait)

heavy_task(0.9)
heavy_task.set_threshold(0.5)
heavy_task(0.9)

#help(heavy_task)

"""

  【コードレビュー】

   1. 正確性 (★★★☆☆):
       * 実行時の閾値変更と計測ロジックは正しく動作しています。
       * 一方で、help(heavy_task) を実行すると関数の情報ではなく Wrapper
         クラスの情報が出てしまうため、メタデータの継承に課題が残っています。
   2. 可読性 (★★★★☆):
       * クラスを使うことで「状態」と「メソッド」のまとまりが良く、直感的です。
   3. 効率性 (★★★☆☆):
       * 関数の代わりにクラスインスタンスを生成するため、純粋な関数デコレータより若干オーバーヘッドがありますが、今回の
         用途では無視できる範囲です。

  ---

  【修正へのヒント】

  functools.wraps がクラス（Wrapper）に対してうまく使えなかったのは、wraps
  が「関数」をラップすることを前提に設計されているからです。

  要件の「メタデータの完全な継承」を満たしつつ set_threshold
  を実現するために、「関数（クロージャ）ベース」で考えてみましょう。

  ヒント 1: クロージャ内の変数へのアクセス
  Pythonでは、関数の中で定義した内側の関数から、外側の変数を読み書きできます。ただし、書き換えるときは nonlocal
  キーワードが必要です。

  ヒント 2: 関数に属性を生やす
  Pythonにおいて、関数はオブジェクトです。つまり、以下のようなことが可能です。

   1 def my_func():
   2     pass
   3
   4 my_func.some_attr = "hello"  # 関数に直接属性を付けられる！

  ヒント 3: functools.wraps の使い方
  クロージャ（関数の中に定義された関数）に対して wraps を適用すると、元の関数の名前やドキュメントをコピーしてくれます。

   1 def decorator(f):
   2     @functools.wraps(f)
   3     def wrapper(*args, **kwargs):
   4         # ここで f を実行
   5         pass
   6
   7     # ここで wrapper に set_threshold メソッド（関数）を生やせるのでは？
   8     return wrapper

  この「関数に直接メソッド（関数）を生やす」というアプローチで、functools.wraps を活かした実装に挑戦してみませんか？
"""

