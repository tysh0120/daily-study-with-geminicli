import unittest
from atomic_file_manager import FileTransaction
import os
import shutil
import pathlib


class TestFileTransaction(unittest.TestCase):
    def setUp(self):
        if os.path.exists("test/data"):
            shutil.rmtree("test/data")
        os.makedirs("test/data", exist_ok=True)

    def test___exit___cleanup_temp_directory(self):
        with FileTransaction() as tx:
            tmpdir = tx._workdir.name
            self.assertTrue(os.path.isdir(tmpdir), "一時フォルダが作られる")
        self.assertFalse(
            os.path.isdir(tmpdir), "スコープを抜けると一時フォルダは削除される"
        )

    def test_generate_temp_file_name(self):
        with FileTransaction() as tx:
            self.assertNotEqual(
                tx._generate_temp_file_name(),
                tx._generate_temp_file_name(),
                "generate_temp_file_nameは呼ばれるたびに異なる値を返す",
            )
            self.assertNotEqual(
                tx._generate_temp_file_name(),
                tx._generate_temp_file_name(),
                "generate_temp_file_nameは呼ばれるたびに異なる値を返す",
            )
            self.assertNotEqual(
                tx._generate_temp_file_name(),
                tx._generate_temp_file_name(),
                "generate_temp_file_nameは呼ばれるたびに異なる値を返す",
            )

    def test_write(self):
        with FileTransaction() as tx:
            tx.write("test/data/test.txt", "test")
        self.assertTrue("test.txt")

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

    def test_write_move_delete(self):
        self.assertFalse(os.path.isfile("test/data/test.txt"))
        with FileTransaction() as tx:
            tx.write("test/data/test.txt", "test")
            tx.move("test/data/test.txt", "test/data/moved.txt")
            tx.delete("test/data/moved.txt")

        self.assertFalse(os.path.isfile("test/data/test.txt"))
        self.assertFalse(os.path.isfile("test/data/moved.txt"))


if __name__ == "__main__":
    unittest.main()
