"""
  1. 【今日のテーマ】
  Python のメモリ管理：循環参照の回避と weakref モジュール

  2. 【課題：メモリリークを防ぐ「親子関係」の構築】

  多くのデータ構造（ツリー、グラフなど）では、親から子への参照だけでなく、子から親への参照（逆参照）が必要になります。し
  かし、Python の参照カウンタ方式では、これが原因でメモリが即座に解放されない問題が発生します。

  以下の要件を満たすコードを python/memory_management.py として実装してください。

  要件：
   1. 循環参照の再現:
       - Node クラスを作成し、名前 (name)、親 (parent)、子リスト (children) を持たせる。
       - 親子を双方向に接続した後、親オブジェクトを del しても __del__
         メソッド（デストラクタ）が呼ばれない（＝メモリが解放されない）現象を確認する。
   2. weakref による修正:
       - weakref モジュールを使用して、self.parent を弱参照にすることで循環参照を解消し、del 後に即座に __del__
         が呼ばれるようにする。
   3. インスタンス・マネージャの実装:
       - Node インスタンスを ID で管理する NodeRegistry クラスを作成する。
       - 内部で weakref.WeakValueDictionary
         を使用し、「外部からの参照がなくなったノードは、レジストリからも自動的に消える」仕組みを実装する。
"""
import weakref

class Node:
    def __init__(self, name):
        self.name = name
        self.parent = None
        self.children = []

    def get_parent(self):
        return self.parent()

    def get_children(self):
        return self.children

    def add_child(self, child):
        self.children.append(child)
        child.set_parent(self)

    def set_parent(self, parent):
        self.parent = weakref.ref(parent, lambda x: print(f'{x()} のコールバックです'))

    def __del__(self):
        print(f'{self.name}: __del__が呼ばれた')


class NodeRegistry:
    def __init__(self, nodes=[]):
        self.nodes = weakref.WeakValueDictionary({id(x): x for x in nodes})

    def add(self, node):
        self.nodes[id(node)] = node

    def size(self):
        return len(self.nodes)

import unittest
import time

tester = unittest.TestCase()
registry = NodeRegistry()

n0 = Node('node0')
registry.add(n0)

print('n0 を消します')
del(n0)
time.sleep(1)
tester.assertEqual(0, registry.size())

n1 = Node('node1')
registry.add(n1)
n2 = Node('node2')
registry.add(n2)
n1.add_child(n2)
tester.assertIs(n2.get_parent(), n1)
tester.assertIs(n1.get_children()[0], n2)

print('親n1を消します')
del(n1)
del(n2)

tester.assertEqual(0, registry.size())


n3 = Node('node3')
n4 = Node('node4')
n3.add_child(n4)
registry.add(n3)
registry.add(n4)
del(n3)
tester.assertEqual(1, registry.size())

print('finish')
