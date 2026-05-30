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
