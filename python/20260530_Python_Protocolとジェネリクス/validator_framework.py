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
