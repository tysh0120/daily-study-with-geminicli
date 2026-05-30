【課題：TaskRunnerに「安全な停止」機能を追加しよう】
  昨日の優先度付き TaskRunner
  は非常に実用的ですが、実際の運用（本番サーバーなど）では「プログラムを止めるとき」の挙動が極めて重要になります。

  もし実行中にサーバーを急に止めてしまうと、処理中のデータが中途半端に消えたり、不整合が起きたりする可能性があります。そ
  こで、安全にシステムを閉じるための Graceful Shutdown（優雅な停止） 機能を TaskRunner に実装してみましょう。

  要件：
   1. shutdown() メソッドを追加してください。
   2. shutdown() が呼び出された後は、新たに run() を実行しようとするとエラーを返す（または即座に Reject
      する）ようにしてください。
   3. すでにキューで待機しているタスクは、実行せずに「キャンセルされた」として Reject してください。
   4. 現在実行中のタスクについては、それらがすべて完了するまで shutdown() メソッド自体を await
      できるようにしてください。
   5. （発展）shutdown(timeout)
      のようにタイムアウトを指定でき、一定時間待っても終わらない場合は待つのをやめて終了するようにしてください。

  ベースコード：
  昨日の task-runner-with-priority.js をベースに拡張してください。

    1 // 実装イメージ
    2 const runner = new TaskRunner(2);
    3
    4 // タスクをいくつか投入...
    5 runner.run(task1);
    6 runner.run(task2);
    7 runner.run(task3); // これはキューに入る
    8
    9 // 停止命令
   10 await runner.shutdown(5000); // 5秒待機
   11 console.log("System stopped safely.");
