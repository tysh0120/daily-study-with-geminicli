import os
from pathlib import Path
import tempfile
from dataclasses import dataclass
from typing import Optional


@dataclass
class CommitInfo:
    src_path: Optional[str | Path] = None
    dest_path: Optional[str | Path] = None
    backup_path: Optional[str | Path] = None
    done: bool = False


class FileTransaction:
    """
    複数のファイル操作をアトミックに管理するコンテキストマネージャ。
    """

    def __init__(self):
        self._commit_list = []
        self._temp_id = 0

    def __enter__(self):
        self._workdir = tempfile.TemporaryDirectory()
        return self

    def __exit__(self, exc_type, _exc_val, _exc_tb):
        try:
            if exc_type is not None:
                self._rollback()
                return
            self._commit()
        finally:
            self._workdir.cleanup()

    def _move_to_temp(self, path: str | Path) -> str | None:
        """一時フォルダにatomicに移動して移動後のファイル名を返却"""
        try:
            temp_path = self._generate_temp_file_name()
            os.replace(path, temp_path)
            return temp_path
        except FileNotFoundError:
            return

    def write(self, path: str | Path, content: str) -> None:
        """
        ファイル書き込み
        一時フォルダにファイルを作成してコミットリストに情報追加
        """
        src_path = self._generate_temp_file_name()
        with open(src_path, "w") as f:
            f.write(content)
            f.flush()

        # コミットリストに追加
        self._commit_list.append(
            CommitInfo(
                src_path=src_path,
                dest_path=Path(path).resolve(),
            )
        )

    def delete(self, path: str | Path) -> None:
        """
        ファイル削除
        コミットリストに情報追加
        """
        # コミットリストに追加
        self._commit_list.append(CommitInfo(dest_path=Path(path).resolve()))

    def move(self, src_path: str | Path, dest_path: str | Path) -> None:
        """
        ファイルリネーム
        コミットリストに情報追加
        """
        # コミットリストに追加
        self._commit_list.append(
            CommitInfo(
                src_path=Path(src_path).resolve(),
                dest_path=Path(dest_path).resolve(),
            )
        )

    def _commit(self) -> None:
        """
        コミット
        コミットリストに指定されたファイルの操作を行う
        """
        print("commit")
        try:
            for commit_info in self._commit_list:
                # バックアップ作成
                commit_info.backup_path = self._move_to_temp(commit_info.dest_path)
                # ファイルの移動
                if commit_info.src_path and commit_info.dest_path:
                    os.replace(commit_info.src_path, commit_info.dest_path)
                commit_info.done = True
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
        for commit_info in self._commit_list[::-1]:
            if not commit_info.done:
                continue
            if commit_info.src_path and commit_info.dest_path:
                os.replace(commit_info.dest_path, commit_info.src_path)

            if commit_info.backup_path and commit_info.dest_path:
                os.replace(commit_info.backup_path, commit_info.dest_path)
            commit_info.done = False

    def _generate_temp_file_name(self) -> str:
        """
        一時ディレクトリの中で一意のファイル名を作成して返却
        """
        self._temp_id = self._temp_id + 1
        return os.path.join(self._workdir.name, str(self._temp_id))
