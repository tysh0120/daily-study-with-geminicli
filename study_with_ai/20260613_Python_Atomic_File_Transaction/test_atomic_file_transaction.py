import unittest
from atomic_file_manager import FileTransaction, WorkDir, MultipleException
import os
import shutil
import pathlib


class TestMultipleException(unittest.TestCase):
    def test_str(self):
        me = MultipleException("this is a message", [])
        self.assertEqual(str(me), "this is a message")


class TestWorkDir(unittest.TestCase):
    def setUp(self):
        self.workdir = WorkDir()

    def tearDown(self):
        self.workdir.cleanup()

    def test_generate_temp_name(self):
        self.assertNotEqual(
            self.workdir.generate_temp_name(), self.workdir.generate_temp_name()
        )


class TestFileTransaction(unittest.TestCase):
    def setUp(self):
        if os.path.exists("test/data"):
            shutil.rmtree("test/data")
        os.makedirs("test/data", exist_ok=True)

    def test_write(self):
        with FileTransaction() as tx:
            tx.write("test/data/test.txt", "test")
        self.assertTrue(os.path.isfile("test/data/test.txt"))

    def test_move(self):
        pathlib.Path("test/data/test.txt").touch()
        with FileTransaction() as tx:
            tx.move("test/data/test.txt", "test/data/test_moved.txt")

        self.assertTrue(
            os.path.isfile("test/data/test_moved.txt"), "指定先にファイルが作られる"
        )
        self.assertFalse(os.path.isfile("test/data/test.txt"), "元のファイルは消える")

    def test_delete(self):
        pathlib.Path("test/data/test.txt").touch()
        self.assertTrue(os.path.isfile("test/data/test.txt"))
        with FileTransaction() as tx:
            tx.delete("test/data/test.txt")

        self.assertFalse(os.path.isfile("test/data/test.txt"))

    def test_dst_path_original_file_will_be_recovered(self):
        with open("test/data/original.txt", "w", encoding="utf-8") as f:
            f.write("original text")
            f.flush()

        with self.assertRaises(FileNotFoundError):
            with FileTransaction() as tx:
                tx.delete("test/data/original.txt")
                tx.delete("test/data/exception_raises")
        self.assertTrue(os.path.isfile("test/data/original.txt"))
        with open("test/data/original.txt") as f:
            self.assertEqual("original text", f.read())

        with self.assertRaises(FileNotFoundError):
            with FileTransaction() as tx:
                tx.write("test/data/original.txt", "modified")
                tx.delete("test/data/exception_raises")
        self.assertTrue(os.path.isfile("test/data/original.txt"))
        with open("test/data/original.txt") as f:
            self.assertEqual("original text", f.read())

        with self.assertRaises(FileNotFoundError):
            with FileTransaction() as tx:
                tx.write("test/data/test.txt", "modified")
                tx.move("test/data/test.txt", "test/data/original.txt")
                tx.delete("test/data/exception_raise")
        self.assertTrue(os.path.isfile("test/data/original.txt"))
        with open("test/data/original.txt") as f:
            self.assertEqual("original text", f.read())

    def test_write_move_delete(self):
        self.assertFalse(os.path.isfile("test/data/test.txt"))
        with FileTransaction() as tx:
            tx.write("test/data/test.txt", "test")
            tx.move("test/data/test.txt", "test/data/moved.txt")
            tx.delete("test/data/moved.txt")

        self.assertFalse(os.path.isfile("test/data/test.txt"))
        self.assertFalse(os.path.isfile("test/data/moved.txt"))

    def test_move_move(self):
        pathlib.Path("test/data/test1.txt").touch()
        with FileTransaction() as tx:
            tx.move("test/data/test1.txt", "test/data/test2.txt")
            tx.move("test/data/test2.txt", "test/data/result.txt")
        self.assertFalse(
            os.path.isfile("test/data/test1.txt"), "第１の移動元のファイルはない"
        )
        self.assertFalse(
            os.path.isfile("test/data/test2.txt"), "第２の移動元のファイルはない"
        )
        self.assertTrue(
            os.path.isfile("test/data/result.txt"), "移動先のファイルは作成される"
        )

    def test_move_to_same_name(self):
        with FileTransaction() as tx:
            tx.write("test/data/test1.txt", "test1")
            tx.write("test/data/test2.txt", "test2")
            tx.move("test/data/test1.txt", "test/data/result.txt")
            tx.move("test/data/test2.txt", "test/data/result.txt")

        self.assertFalse(os.path.isfile("test/data/test1.txt"), "移動元は消える")
        self.assertFalse(os.path.isfile("test/data/test2.txt"), "移動元は消える")

        with open("test/data/result.txt") as f:
            self.assertEqual(f.read(), "test2", "後に移動したものが残る")

    def test_exception(self):
        pathlib.Path("test/data/test.txt").touch()
        try:
            with FileTransaction() as tx:
                tx.move("test/data/test.txt", "test/data/moved.txt")
                raise Exception("ブロック内で例外発生")
        except Exception as e:
            pass

        self.assertTrue(
            os.path.isfile("test/data/test.txt"),
            "ブロック内で例外発生するとmove元のファイルは戻る",
        )
        self.assertFalse(
            os.path.isfile("test/data/moved.txt"),
            "ブロック内で例外が発生するとmove先のファイルは消える",
        )

    def test_delete_not_exist_file(self):
        with self.assertRaises(FileNotFoundError):
            with FileTransaction() as tx:
                tx.delete("test/data/notfound.txt")

    def test_move_not_exist_file(self):
        with self.assertRaises(FileNotFoundError):
            with FileTransaction() as tx:
                tx.move("test/data/notfound.txt", "test/data/dummy.txt")


if __name__ == "__main__":
    unittest.main()
