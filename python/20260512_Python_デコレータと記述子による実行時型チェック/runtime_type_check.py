"""
【今日のテーマ】
  Python: デコレータと記述子（Descriptor）による「実行時型チェック」の実装

  【課題：型ヒントを尊重するデータクラスを作ってみよう】
  Pythonの標準的な dataclass は型ヒントを記述できますが、実行時の型チェック（強制）までは行いません。
  今回は、クラスデコレータと 記述子（Descriptor）
  プロトコルを組み合わせて、プロパティへの代入時に型を自動検証する仕組みを自作してみましょう。

  具体的な要件：
   1. @runtime_type_check というクラスデコレータを作成してください。
   2. このデコレータをクラスに付与すると、クラス内で定義された型ヒント（__annotations__）を読み取り、代入時にその型であ
      るかを自動で検証するようにしてください。
   3. もし指定された型と異なる値が代入されようとした場合、TypeError
      を発生させ、「どの属性が、どの型を期待していたか」がわかるメッセージを出してください。
   4. int, str, float などの基本型をサポートしてください。
   5. 発展課題： __init__ での初期化時にも型チェックが効くように工夫してみてください。

  期待される動作例：

   1 @runtime_type_check
   2 class User:
   3     name: str
   4     age: int
   5
   6 u = User("Alice", 25)  # OK
   7 u.age = "25"           # TypeError: age must be int, not str
"""

class TypedProperty:
    def __init__(self, name, expected_type):
        self.name = name
        self.expected_type = expected_type

    def __set__(self, instance, value):
        print(f'{self.name} := {value}')
        if not isinstance(value, self.expected_type):
            raise TypeError(f'Type of {self.name} must be {self.expected_type}, but got {type(value)}')

        instance.__dict__[self.name] = value
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)


def runtime_type_check(cls):
    print(cls.__annotations__)
    annotation_keys = cls.__annotations__.keys()
    for key in annotation_keys:
        setattr(cls, key, TypedProperty(key, cls.__annotations__[key]))
    def __init__(self, *args, **kwargs):
        # 位置引数
        for value, key in zip(args, annotation_keys):
            setattr(self, key, value)
        # キーワード引数
        for key in cls.__annotations__:
            if key in kwargs:
                setattr(self, key, kwargs[key])
    cls.__init__ = __init__
    return cls

@runtime_type_check
class User:
    name: str
    age: int

u = User()
u.name = 'tuyosi'
u.age = 53
print(f"User: {u.name}, {u.age}")
try:
    u.name = 123
except TypeError as e:
    print(f"Caught expected error: {e}")

u2 = User(name='tuyosi', age=53)
print(f"User2: {u2.name}, {u2.age}")

u4 = User('tuyosi', 53)
print(f"User4: {u4.name}, {u4.age}")

