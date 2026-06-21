import os
from pathlib import Path
import tempfile
from dataclasses import dataclass
from typing import Optional


class MultipleException(Exception):
    def __init__(self, message, exceptions: list[Exception]):
        self._exceptions = exceptions
        super().__init__(message)

    def exceptions(self):
        return self._exceptions


class WorkDir:
    def __init__(self):
        self._workdir = tempfile.TemporaryDirectory()
        self._counter = 0

    def generate_temp_name(self) -> str:
        self._counter = self._counter + 1
        return os.path.join(self._workdir.name, str(self._counter))

    def cleanup(self):
        self._workdir.cleanup()


@dataclass
class ReplaceCommand:
    src: str | Path
    dst: str | Path
    workdir: WorkDir
    bak: Optional[str | Path] = None
    done: bool = False

    def do(self) -> None:
        # バックアップ取得
        try:
            temp_name = self.workdir.generate_temp_name()
            os.replace(self.dst, temp_name)
            self.bak = temp_name
        except FileNotFoundError:
            pass
        # ファイル移動
        os.replace(self.src, self.dst)
        self.done = True

    def undo(self) -> None:
        self.done = False
        # ファイル移動取り消し
        os.replace(self.dst, self.src)
        # バックアップがあれば復元
        if self.bak:
            os.replace(self.bak, self.dst)

    def is_done(self) -> bool:
        return self.done


class FileTransaction:
    """
    複数のファイル操作をアトミックに管理するコンテキストマネージャ。
    """

    def __init__(self):
        self._replace_commands = []
        self._temp_id = 0

    def __enter__(self):
        self._workdir = WorkDir()
        return self

    def __exit__(self, exc_type, _exc_val, _exc_tb):
        try:
            if exc_type is not None:
                self._rollback()
                return
            self._commit()
        finally:
            self._workdir.cleanup()

    def write(self, path: str | Path, content: str) -> None:
        """
        ファイル書き込み
        一時フォルダにファイルを作成してコミットリストに情報追加
        """
        src_path = self._workdir.generate_temp_name()
        with open(src_path, "w") as f:
            f.write(content)
            f.flush()

        # コミットリストに追加
        self._replace_commands.append(
            ReplaceCommand(src=src_path, dst=path, workdir=self._workdir)
        )

    def delete(self, path: str | Path) -> None:
        """
        ファイル削除
        コミットリストに情報追加
        """
        # コミットリストに追加
        self._replace_commands.append(
            ReplaceCommand(
                src=Path(path).resolve(),
                dst=self._workdir.generate_temp_name(),
                workdir=self._workdir,
            )
        )

    def move(self, src_path: str | Path, dest_path: str | Path) -> None:
        """
        ファイルリネーム
        コミットリストに情報追加
        """
        # コミットリストに追加
        self._replace_commands.append(
            ReplaceCommand(
                src=Path(src_path).resolve(),
                dst=Path(dest_path).resolve(),
                workdir=self._workdir,
            )
        )

    def _commit(self) -> None:
        """
        コミット
        指定されたファイルの操作を行う
        """
        print("commit")
        try:
            for command in self._replace_commands:
                command.do()
        except Exception as e:
            self._rollback()
            raise e

    def _rollback(self) -> None:
        """
        ロールバック
        処理中およびコミット中に異常発生時にコールされる想定。
        途中までコミットされた情報をもとに復元する。
        """
        print("rollback")
        exceptions = []
        for command in self._replace_commands[::-1]:
            if not command.is_done():
                continue
            try:
                command.undo()
            except Exception as e:
                exceptions.append(e)
        if len(exceptions) > 0:
            raise MultipleException("ロールバック中にエラーが発生しました", exceptions)
