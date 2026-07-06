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

