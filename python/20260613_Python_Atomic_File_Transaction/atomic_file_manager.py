import os
from pathlib import Path
import tempfile

# import sutil


class FileTransaction:
    """
    複数のファイル操作をアトミックに管理するコンテキストマネージャ。
    """

    def __init__(self):
        self.commit_list = []
        self.temp_id = 0

    def __enter__(self):
        self._workdir = tempfile.TemporaryDirectory()
        return self

    def __exit__(self, exc_type, _exc_val, _exc_tb):
        self.commit()
        self._workdir.cleanup()
        if exc_type is not None:
            print(f"エラー発生")

    def move_to_temp(self, path: str | Path):
        """一時フォルダにatomicに移動して移動後のファイル名を返却"""
        try:
            temp_path = self.generate_temp_file_name()
            os.replace(path, temp_path)
            return temp_path
        except FileNotFoundError:
            return

    def write(self, path: str | Path, content: str):
        # 一時フォルダにファイル書き込み
        src_path = self.generate_temp_file_name()
        with open(src_path, "w") as f:
            f.write(content)
            f.flush()

        # コミットリストに追加
        self.commit_list.append(
            dict(
                action="write",
                src_path=src_path,
                dest_path=Path(path).resolve(),
                backup_path=self.move_to_temp(path),  # 書き込み先を退避
                done=False,
            )
        )

    def delete(self, path: str | Path):
        # コミットリストに追加
        self.commit_list.append(
            dict(
                action="delete",
                src_path=Path(path).resolve(),
                dest_path=self.generate_temp_file_name(),
                done=False,
            )
        )

    def move(self, src_path: str | Path, dest_path: str | Path):
        # コミットリストに追加
        self.commit_list.append(
            dict(
                action="move",
                src_path=Path(src_path).resolve(),
                dest_path=Path(dest_path).resolve(),
                backup_path=self.move_to_temp(dest_path),  # 書き込み先を退避
                done=False,
            )
        )

    def commit(self):
        print("commit")
        try:
            for commit_info in self.commit_list:
                if "src_path" in commit_info and "dest_path" in commit_info:
                    os.replace(commit_info["src_path"], commit_info["dest_path"])
                commit_info["done"] = True
        except Exception as e:
            print(f"エラー発生 {e}")
            self.rollback()
            raise e

    def rollback(self):
        print("rollback")
        for commit_info in self.commit_list[::-1]:
            print(commit_info)
            if not commit_info["done"]:
                continue
            if "src_path" in commit_info and "dest_path" in commit_info:
                os.replace(commit_info["dest_path"], commit_info["src_path"])

            if "backup_path" in commit_info and "dest_path" in commit_info:
                os.replace(commit_info["backup_path"], commit_info["dest_path"])
            commit_info["done"] = False

    def generate_temp_file_name(self):
        self.temp_id = self.temp_id + 1
        return os.path.join(self._workdir.name, str(self.temp_id))


if __name__ == "__main__":
    with FileTransaction() as tx:
        tx.write("test/data/aa.txt", "bb")
        tx.move("test/data/aa.txt", "test/data/bb.txt")
        with open("test/data/xx.txt", "w") as f:
            f.write("xx")
            f.flush()
        tx.delete("test/data/xx.txt")
