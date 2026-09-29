// Module 12 — Object-oriented Python.
// The claim being tested across these three lessons is that Python's object
// model is *smaller* than most OO languages': no headers, no vtables to reason
// about, one namespace per object, and a set of conventions that make your class
// usable by the language itself. The payoff is that a well-written Python class
// is usually less code than the equivalent dict, but only if you know when that
// is not true — which is where the third lesson ends up.

import { mod } from '../blocks';

export const M12 = mod(
  'crs-python-programming',
  'py-m12',
  12,
  'Module 12 — Object-Oriented Python',
  'Classes and the instance model, inheritance and the dunder protocol, and the dataclasses and properties that remove most boilerplate.',
  [
    {
      title: 'Classes, instances and attributes',
      summary: 'self, the instance __dict__, class versus instance attributes, the mutable class attribute bug, and attribute lookup order.',
      duration: 18,
      build: (b) => [
        b.md(`## The smallest useful class`),
        b.code(`class Counter:
    def __init__(self, name):
        self.name = name
        self.count = 0

    def bump(self):
        self.count += 1
        return self.count


alice = Counter("alice")
alice.bump()
print(alice.count)        # 1`, 'counter.py'),
        b.md(`
Three things are happening in \`Counter("alice")\` and it is worth being able to name all of them:

1. \`Counter\` is a **class**, and calling it invokes \`type.__call__\`.
2. \`type.__call__\` creates a **new, empty object** of type \`Counter\`.
3. That new object's \`__init__\` is then called with the arguments you supplied, and — this is the part that looks like magic — with the object itself as the first argument.

So \`Counter("alice")\` is mechanically \`object.__init__(new_object, "alice")\`. The \`self\` in \`def __init__(self, name)\` is simply the name you gave to that first parameter. Python has no keyword called \`self\`; delete it from the signature and the call fails with a \`TypeError\` about a missing argument.

\`self\` is how a method knows *which* object it is operating on. The same function object runs a thousand times with a thousand different \`self\` values. That is the whole mechanism, and once you believe it, inheritance and dunder methods stop being arbitrary.

## Everything is an object, including the class`),
        b.code(`# Continuing in the same session as counter.py: Counter and alice are already bound.
print(type(alice))          # <class '__main__.Counter'>
print(alice.__class__)       # <class '__main__.Counter'>   (the same thing)
print(isinstance(alice, Counter))    # True
print(issubclass(Counter, object))   # True
print(Counter.__mro__)
# (<class '__main__.Counter'>, <class 'object'>)
print(callable(Counter), callable(alice.bump))
# True True

# The class is an object, so it can hold state too.
Counter.total_made = 0
alice.__init__("ignored")   # re-running __init__ is legal and just resets state
print(alice.name)           # 'ignored'`, 'introspect.py'),
        b.md(`
The line that gets people's attention is the last block. Python does not stop you calling \`__init__\` again, and doing so overwrites the object's attributes with whatever the constructor derives from the new arguments. That is not a feature to use; it is a reminder that the object model imposes no invariants. Your class is a convention that the interpreter politely respects.

## Instance attributes versus class attributes

This is the single most consequential distinction in Python's object model, and the bug it causes is the most common one in production Python.`),
        b.code(`class Team:
    members = []            # CLASS attribute: built once, at class-body time

    def __init__(self, name):
        self.name = name    # INSTANCE attribute: one per object


red = Team("red")
blue = Team("blue")

red.members.append("ada")
print(red.members, blue.members)
# ['ada'] ['ada']        <-- both teams gained the same member`, 'shared_state.py'),
        b.md(`
\`Team.members\` is a list created **once**, when the class body executed. Every \`Team\` instance that does not shadow it with its own attribute resolves \`self.members\` to that one list. The classic \`TypeError: cannot create a class attribute\` fix is a signal that the class attribute was a mutable default in disguise.

The fix is either an explicit instance assignment or, better, no mutable class attribute at all:`),
        b.code(`class Team:
    def __init__(self, name):
        self.name = name
        self.members = []   # built per instance


red = Team("red")
blue = Team("blue")
red.members.append("ada")
print(red.members, blue.members)
# ['ada'] []`, 'per_instance.py'),
        b.md(`
Read-only class attributes are fine as class attributes — that is what they are for: constants, compiled regular expressions, a shared immutable default, a registry. The rule is simply **mutable shared state does not go in the class body unless you have decided every instance must share exactly one copy**.

## Attribute lookup, in the order Python does it

When you write \`obj.attr\`, Python runs a specific algorithm. Knowing it turns "why is my property being ignored" from a mystery into a lookup.`),
        b.code(`class Celsius:
    def __init__(self, degrees):
        self.degrees = degrees

    @property
    def fahrenheit(self):
        return self.degrees * 9 / 5 + 32


c = Celsius(100)
print(c.fahrenheit)                 # 212.0 — the property ran, no attribute exists
print(c.__dict__)                   # {'degrees': 100}
print(Celsius.fahrenheit)           # <property object> — on the class it is not a number`, 'property_lookup.py'),
        b.md(`
The order, for \`obj.attr\`:

1. **Data descriptors on the type.** Look through \`type(obj).__mro__\` for something with both \`__get__\` and \`__set__\` — a \`property\` is one. If found, it wins, *even if the instance dict has the same name*.
2. **The instance \`__dict__\`.** A plain assignment in \`__init__\` puts it here, and here it wins over ordinary class attributes.
3. **Non-data descriptors on the type.** Methods live here: a function has \`__get__\` but no \`__set__\`, so an instance attribute of the same name shadows it.
4. **\`__getattr__\`**, if you defined one. If nothing finds the name, this is the last chance, and its default implementation raises \`AttributeError\`.

Step 1 is the rule that surprises people: **a property and an instance attribute with the same name cannot coexist, and the property silently wins.** That is why the standard property pattern uses a different, underscore-prefixed name for the storage.

## __dict__, dynamic attributes, and __slots__

Every ordinary instance carries a \`__dict__\`, a real dictionary created on first attribute assignment:`),
        b.code(`class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y


p = Point(1, 2)
print(p.__dict__)          # {'x': 1, 'y': 2}
p.label = "hero"           # legal: no declaration, no __slots__
print(p.__dict__)          # {'x': 1, 'y': 2, 'label': 'hero'}
del p.label
print(vars(p) == p.__dict__)   # True — vars() is just the same thing`, 'dynamic_attrs.py'),
        b.md(`
Being able to bolt attributes onto an object at runtime is genuinely useful — it is how \`pytest\` attaches \`request\` to a fixture, how \`unittest.mock\` marks a stub, how many ORMs mark instances dirty. But it also means typos are silent: \`p.y = 3\` then reading \`p.xx\` raises \`AttributeError\` at the point of use, far from the mistake.

The countermeasure is \`__slots__\`, which replaces the per-instance dict with fixed offsets declared up front:`),
        b.code(`class Slotted:
    __slots__ = ("name", "count")

    def __init__(self, name):
        self.name = name
        self.count = 0


s = Slotted("a")
s.name = "b"               # fine
s.other = 1                # AttributeError: 'Slotted' object has no attribute 'other'`, 'slotted.py'),
        b.md(`
You gain roughly 30–40% smaller instances and noticeably faster attribute access, and you lose the ability to attach attributes at runtime, which breaks subclasses that were not written with slots in mind. \`dataclasses.dataclass(slots=True)\` (Python 3.10+) does this for you in one argument.`),
        b.anim('passing', {
          title: 'self is the only thing that says which object',
          badge: 'two instances, one class',
          steps: [
            {
              caption: 'The class body runs, creating the class and nothing else',
              note: 'Executing `class Counter` evaluates the def statements and binds them as attributes of the class. There is no instance, no self, and no data yet — only Counter.registry exists.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'not created yet',
                  cells: [
                    { label: 'self', value: '—', tone: 'free' },
                    { label: 'self.count', value: '—', tone: 'free' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'not created yet',
                  cells: [
                    { label: 'self', value: '—', tone: 'free' },
                    { label: 'self.count', value: '—', tone: 'free' },
                  ],
                },
              ],
            },
            {
              caption: 'Counter("alice") builds an object, then calls __init__',
              note: 'type.__call__ allocates the empty object first and then calls __init__(new_object, "alice"). self is that object, and `self` as a name is your choice — the language only cares about position.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: '__init__ running',
                  call: 'alice = Counter("alice")',
                  cells: [
                    { label: 'self', value: '<Counter 0x…a1>', tone: 'ptr' },
                    { label: 'self.name', value: '(unbound)', tone: 'free' },
                    { label: 'self.count', value: '(unbound)', tone: 'free' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'not created yet',
                  cells: [
                    { label: 'self', value: '—', tone: 'free' },
                    { label: 'self.count', value: '—', tone: 'free' },
                  ],
                },
              ],
            },
            {
              caption: 'self.name = name writes into this object __dict__',
              note: 'Assignment to self.x creates the attribute on the instance. Counter.__dict__ still has no name and no count — instance attributes never appear on the class.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'constructed',
                  cells: [
                    { label: 'self', value: '<Counter 0x…a1>', tone: 'ptr' },
                    { label: 'self.name', value: '"alice"', tone: 'data' },
                    { label: 'self.count', value: '0', tone: 'int' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'not created yet',
                  cells: [
                    { label: 'self', value: '—', tone: 'free' },
                    { label: 'self.count', value: '—', tone: 'free' },
                  ],
                },
              ],
            },
            {
              caption: 'bob is built identically and gets its own dict',
              note: 'Same class, same __init__, two separate __dict__ objects. Nothing is shared except the methods, which is exactly what you want.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'idle',
                  cells: [
                    { label: 'self.name', value: '"alice"', tone: 'data' },
                    { label: 'self.count', value: '0', tone: 'int' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: '__init__ finished',
                  call: 'bob = Counter("bob")',
                  cells: [
                    { label: 'self', value: '<Counter 0x…b7>', tone: 'ptr' },
                    { label: 'self.name', value: '"bob"', tone: 'data' },
                    { label: 'self.count', value: '0', tone: 'int' },
                  ],
                },
              ],
            },
            {
              caption: 'alice.bump() rebinds self to alice for one call',
              note: 'bump is a single function object. Calling it through an instance builds a bound method that has already had the instance substituted for the first parameter.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'bump() running',
                  call: 'alice.bump()',
                  cells: [
                    { label: 'self', value: '<Counter 0x…a1>', tone: 'ptr' },
                    { label: 'self.count', value: '1', tone: 'ok' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'idle, untouched',
                  cells: [
                    { label: 'self.name', value: '"bob"', tone: 'data' },
                    { label: 'self.count', value: '0', tone: 'int' },
                  ],
                },
              ],
            },
            {
              caption: 'bob.bump() — the counts are independent',
              note: 'If the count were shared, alice would read 2 here. That is precisely what happens when the method forgets the self and writes a bare `count += 1`, which creates and rebinds a local.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'idle',
                  cells: [
                    { label: 'self.count', value: '1', tone: 'ok' },
                    { label: 'Counter.registry', value: '1', tone: 'static' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'bump() running',
                  call: 'bob.bump()',
                  cells: [
                    { label: 'self.count', value: '1', tone: 'ok' },
                    { label: 'Counter.registry', value: '1', tone: 'static' },
                  ],
                },
              ],
            },
            {
              caption: '`self.registry += 1` shadowed the class attribute',
              note: 'Reading self.registry found the class attribute, but the += made Python assign to self.registry, so each object now owns a private copy and the shared one still reads 0. Write Counter.registry += 1 when sharing is what you actually mean.',
              panes: [
                {
                  title: 'Instance alice',
                  sub: 'final',
                  cells: [
                    { label: 'self.registry', value: '1  (own copy)', tone: 'ok' },
                    { label: 'self.count', value: '1', tone: 'int' },
                  ],
                },
                {
                  title: 'Instance bob',
                  sub: 'final',
                  cells: [
                    { label: 'self.registry', value: '1  (own copy)', tone: 'ok' },
                    { label: 'self.count', value: '1', tone: 'int' },
                  ],
                },
              ],
            },
          ],
        }),
        b.lead('So when should you write a class at all?'),
        b.md(`The honest answer is: less often than most OO-trained instincts suggest. Python's \`dict\` is not a lesser citizen — for a bag of related values with no behaviour, a dict is smaller, faster to write, and easier to refactor.`),
        b.code(`# A dict is the right tool when there is no behaviour.
point = {"x": 1, "y": 2}
print(point["x"])                       # 1

# A class earns its keep the moment you attach behaviour or invariants.
class Point:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)

    def __add__(self, other):
        return Point(self.x + other.x, self.y + other.y)

    def __repr__(self):
        return f"Point({self.x:g}, {self.y:g})"


print(Point(1, 2) + Point(3, 4))         # Point(4, 6)`, 'dict_vs_class.py'),
        b.md(`
Three concrete signals that a class is the right call:

- **There is a method that would be written as \`do_thing(obj, x)\` taking the object as its first parameter.** That parameter *is* \`self\`.
- **There is an invariant** — a value that must be validated or derived on every assignment. A \`@property\` with a setter is how you enforce it in Python without \`__setattr__\` gymnastics.
- **There is behaviour the language should trigger for you.** If \`len(x)\`, \`x in y\`, \`x + y\`, or \`with x:\` should work on your type, that is a class.

Everything else is a dict, a \`NamedTuple\`, or a \`dataclass\` — and module 12's third lesson is mostly about those.`),
        b.diagram(
          'How `obj.attr` is resolved',
          `flowchart TD
    A["obj.attr"] --> B{"type(obj).__mro__ has a<br/>DATA descriptor?<br/>(has __get__ AND __set__)"}
    B -- "yes — property, cached_property" --> C["Call its __get__(obj, type(obj))<br/>INSTANCE DICT IS IGNORED"]
    B -- "no" --> D{"'attr' in obj.__dict__ ?"}
    D -- "yes" --> E["Return the instance value"]
    D -- "no" --> F{"type(obj).__mro__ has a<br/>NON-DATA descriptor?<br/>(__get__ only — every method)"}
    F -- "yes" --> G["Bind and return<br/>func(obj, ...) as a bound method"]
    F -- "no" --> H{"__getattr__ defined?"}
    H -- "yes" --> I["Call it as a last resort"]
    H -- "no" --> J["AttributeError:<br/>'Point' object has no attribute 'attr'"]`
        ),
        b.warn(
          'The mutable class attribute, one more time',
          '`class Config: defaults = {}` followed by `self.defaults.update(x)` inside `__init__` mutates state shared by every instance in the process, including in your test suite. It survives code review, it survives type checking, and it only shows up under concurrency. Mutable defaults belong in `__init__`, or as `__slots__`-declared per-instance storage, or as an immutable constant.'
        ),
        b.tip(
          'Introspection that pays for itself',
          'Run `vars(obj)`, `type(obj).__mro__`, and `dir(obj)` in a REPL whenever a class misbehaves. `vars()` shows exactly what is in the instance dict, `dir()` shows the full candidate list including inherited and dunder names, and together they resolve almost every "the attribute is there but it is None" puzzle in seconds.'
        ),
      ],
      questions: [
        [
          'In `class Counter: registry = 0` followed by `def bump(self): self.registry += 1`, what does Counter.registry read after two different instances each call bump()?',
          [
            'It reads 1, because the += created a private copy on the first instance',
            'It reads 2, because += assigns through to the class attribute',
            'It reads 1 — the second += also shadows locally on the first instance',
            'It raises AttributeError because registry is a class attribute',
          ],
          0,
          '`self.registry += 1` is a read followed by an assignment to self.registry. The read finds the class attribute (0), then the assignment stores the result on the *instance*, shadowing the class attribute. The class attribute never changes, and each object ends up with its own copy — which is why the "shared counter" people were expecting silently does not share.',
        ],
        [
          'Why does `point.label = "hero"` work on an ordinary instance but raise AttributeError on one with `__slots__`?',
          [
            '__slots__ hides the attribute from repr but it is still stored',
            '__slots__ removes the per-instance __dict__, so only the declared names have anywhere to live',
            'The class has to define __setattr__ for dynamic attributes to work',
            'Dynamic attributes require the attribute to start with an underscore',
          ],
          1,
          'Without __slots__, an instance owns a dict that can hold any name, created lazily. __slots__ replaces that dict with a fixed set of descriptors pointing at fixed offsets, so there is no storage for an undeclared name and the assignment fails immediately. That is both the memory saving and the strictness you are paying for.',
        ],
        [
          'A class defines `temperature` as a property, and `__init__` also assigns `self.temperature = 30`. What happens?',
          [
            'The instance dict wins, because instances shadow class attributes',
            'The property wins and `__init__` raises AttributeError, because data descriptors outrank the instance dict',
            'Both are stored and reading returns the instance value',
            'Python emits a SyntaxError at class definition time',
          ],
          1,
          'Attribute lookup checks for a data descriptor — one with both __get__ and __set__ — on the type before it ever looks at the instance dict. A property is a data descriptor, so it wins and the assignment goes through the setter. Since this property has no setter, the assignment raises. Hence the underscore-prefixed backing attribute in every correct property example.',
        ],
        [
          'What is the strongest practical signal that something should be a class rather than a dict?',
          [
            'It has more than five fields',
            'It needs to be printed, serialised or stored somewhere',
            'You keep writing a function that takes the thing as its first argument and then reads or writes its fields',
            'It has attributes whose names come from user input',
          ],
          2,
          'A function whose first parameter is the object is a method that has not been written yet — that is literally what `self` is. Fields, printing and serialisation are all things a dict does fine. Behaviour, invariants and language-level protocols (len, iteration, operators, context manager) are what require a class.',
        ],
      ],
    },
    {
      title: 'Inheritance, super and dunder methods',
      summary: 'Subclassing, cooperative super() and the MRO, mixins, and the dunder protocol the language calls on your behalf.',
      duration: 20,
      build: (b) => [
        b.md(`## Subclassing is one line, and \`super()\` is not what C++ people expect`),
        b.code(`class Notification:
    def __init__(self, recipient):
        self.recipient = recipient
        self.sent = False

    def send(self):
        raise NotImplementedError("subclasses must implement send()")


class Email(Notification):
    def __init__(self, recipient, subject):
        super().__init__(recipient)          # reuse the parent's setup
        self.subject = subject

    def send(self):
        self.sent = True
        return f"email to {self.recipient}: {self.subject}"


e = Email("ada@example.com", "Build green")
print(e.send())
print(e.sent, isinstance(e, Notification), type(e).__name__)
# email to ada@example.com: Build green
# True True Email`, 'notification.py'),
        b.md(`
Three things to notice.

- \`Email\` inherits \`Notification.__init__\` **only until you define your own**. The moment a subclass defines \`__init__\`, the parent's is shadowed entirely, which is why the explicit \`super().__init__(...)\` call is not optional bookkeeping — it is the only thing that runs the parent half.
- \`super().__init__(recipient)\` is not "call the parent". It is "continue the method resolution order after \`Email\`". With one base class those are the same thing; the distinction is what makes the next section possible.
- \`isinstance(e, Notification)\` is \`True\` because the object knows its class chain. \`issubclass(Email, Notification)\` is the same question asked about the classes themselves and never needs an instance.

## The MRO exists, and here is what it is for

Every class carries a \`__mro__\` — a **method resolution order**, a tuple of classes Python will search left to right for any attribute:`),
        b.code(`class A:
    def hello(self):
        return "A"

class B(A):
    def hello(self):
        return "B" + super().hello()

class C(A):
    def hello(self):
        return "C" + super().hello()

class D(B, C):
    def hello(self):
        return "D" + super().hello()


print(D.mro())
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)
print(D().hello())
# DBCA`, 'mro.py'),
        b.md(`
Read \`DBCA\` carefully, because it is the point. \`super()\` inside \`B.hello\` does **not** jump to \`A\` — it jumps to the next class after \`B\` in \`D\`'s MRO, which is \`C\`. \`C\` then calls \`super()\`, which lands on \`A\`. The chain is cooperative and each class runs exactly once.

Python computes that order with the **C3 linearisation algorithm**, and its one job is to give you:

- **Local precedence**: if \`D\` lists \`B\` before \`C\`, \`B\` comes before \`C\` in the MRO.
- **Monotonicity**: a class cannot appear before one of its own bases in any derived MRO.
- **A consistent, unique order**: two classes with the same bases are guaranteed the same MRO, and a class's own MRO is a tail of every derived MRO.

The practical consequence is that \`super()\` with arguments (\`super().__init__(...)\`) works correctly in *all* of them, which is what makes the mixin pattern safe.

## Mixins: the reason multiple inheritance exists in Python

A **mixin** is a small class that adds capability and is not meant to be instantiated. It is named so you never have to guess — \`class LoggingMixin:\`, \`class SerializableMixin:\`. Each mixin must call \`super()\` at the end of any method it overrides, or it breaks the chain.`),
        b.code(`class TimestampMixin:
    def stamp(self):
        self.stamped = True
        return f"stamped {type(self).__name__}"

    def describe(self):
        return f"<{super().describe()}>"


class SerializableMixin:
    def describe(self):
        return f"{type(self).__name__}({self.as_dict()})"


class Row(SerializableMixin, TimestampMixin):
    def __init__(self, **fields):
        self.fields = fields

    def as_dict(self):
        return dict(self.fields)


r = Row(name="ada", visits=42)
print(r.describe())
# Row({'name': 'ada', 'visits': 42})
print(Row.mro())
# (Row, SerializableMixin, TimestampMixin, object)
print(r.stamp())
# stamped Row`, 'mixins.py'),
        b.md(`
The rule of thumb: **inherit from behaviour, compose for structure.** Multiple inheritance in Python is a tool for mixing capabilities across an otherwise flat hierarchy, not for modelling an is-a tree. If you find yourself writing \`class Dog(Animal, HasFourLegs, Serializable)\`, you almost certainly want \`Animal\` and a composed \`legs\` attribute.

## Dunder methods: the language calling your code

A \`__dunder__\` (double underscore) method is a protocol hook. Python does not look for a function called \`length\` on your object; it looks for \`__len__\`, and it calls it *implicitly*, from syntax you write.

The set you should be able to name from memory, because each one is a piece of syntax that just works on your type:

| Method | Triggered by | Should return | Notes |
| --- | --- | --- | --- |
| \`__repr__\` | \`repr(x)\`, \`{x!r}\`, containers | a string developers read | the debugger and error messages use this |
| \`__str__\` | \`str(x)\`, \`print(x)\`, f-strings | a string humans read | falls back to \`__repr__\` if absent |
| \`__eq__\` | \`==\`, \`!=\`, dict and set membership | \`bool\` | defining it sets \`__hash__\` to \`None\` unless you also define that |
| \`__len__\` | \`len(x)\`, \`bool(x)\` when no \`__bool__\` | \`int\` | must be non-negative |
| \`__getitem__\` | \`x[i]\`, \`for\` loops, unpacking, \`in\` fallback | the element | the single most useful one to implement |
| \`__iter__\` | \`for x in y\`, \`list(y)\`, \`*y\` | an iterator | if you have \`__getitem__\` alone, Python synthesises one |
| \`__add__\` | \`x + y\` | the sum | plus \`__radd__\` for when your type is on the right |
| \`__contains__\` | \`needle in haystack\` | \`bool\` | usually you want this rather than \`__iter__\` |
| \`__enter__\` / \`__exit__\` | \`with obj:\` | any / \`bool\` suppress? | \`__exit__\` returning true swallows the exception |
| \`__call__\` | \`obj(...)\` | the result | makes instances callable |
| \`__hash__\` | putting the object in a set or as a dict key | \`int\` | must be consistent with \`__eq__\` |
| \`__bool__\` | \`bool(x)\`, \`if x:\` | \`bool\` | e.g. an object with no items should be falsy |

Here is a class that buys a great deal of syntax for very little code:`),
        b.code(`class Bag:
    def __init__(self, items):
        self._items = list(items)

    def __len__(self):
        return len(self._items)

    def __getitem__(self, index):
        return self._items[index]

    def __repr__(self):
        return f"Bag({self._items!r})"

    def __contains__(self, needle):
        return needle in self._items


bag = Bag(["apples", "pears"])
print(len(bag))          # 2     -> __len__
print(bag[0])            # apples -> __getitem__
print("pears" in bag)    # True   -> __contains__
print(repr(bag))         # Bag(['apples', 'pears'])
for item in bag:         #        __iter__ synthesised from __getitem__
    print(item)`, 'bag.py'),
        b.md(`
Note the chain on that \`for\` loop: \`iter(bag)\` finds no \`__iter__\`, so it builds a sequence iterator from \`__getitem__\` and calls it with 0, 1, 2, … until \`IndexError\`. Implementing \`__getitem__\` alone is often enough, and it is why slicing, unpacking, and \`enumerate\` all work on the same object without extra code.

## The rule about dunders

**A dunder is for the language, not for you to call.** \`bag.__len__()\` is legal and will work, and you should almost never write it, for three reasons:

1. It is slower — \`len(bag)\` is a fast path in the interpreter; \`bag.__len__()\` is a full attribute lookup plus a call.
2. It is unidiomatic and reads as a mistake to any reviewer.
3. It breaks subclass overrides in a subtle way. If a subclass overrides \`__len__\`, then \`bag.__len__()\` and \`len(bag)\` still agree — but if you ever write \`super().__len__()\` inside one of your own methods you have opted into the manual protocol and must remember every convention.

The exceptions where calling the dunder directly is correct: inside your own class to delegate (\`super().__init__(...)\`, \`super().__repr__()\`), and in \`__eq__\`/\`__hash__\` implementations where the whole point is to invoke the protocol on another object.`),
        b.anim('trace', {
          title: 'A dunder being invoked without you naming it',
          badge: 'implicit protocol',
          code: `class Bag:
    def __init__(self, items):
        self._items = list(items)

    def __len__(self):
        return len(self._items)

    def __contains__(self, needle):
        return needle in self._items

    def __getitem__(self, index):
        return self._items[index]

    def __repr__(self):
        return f"Bag({self._items!r})"


bag = Bag(["apples", "pears"])
n = len(bag)
found = "pears" in bag
first = bag[0]
print(bag)`,
          steps: [
            {
              caption: 'The class body runs; Bag is now a class object',
              note: 'Four function objects created and bound as attributes of Bag. Nothing has been instantiated. The names are protocol markers, not methods anyone calls by name.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'Bag([...]) allocates an object and calls __init__',
              note: 'self._items is a defensive copy. list(items) means later mutation of the caller\'s list cannot reach inside the object — a habit worth forming for every constructor.',
              line: 18,
              vars: [
                { name: 'Bag', value: "<class '__main__.Bag'>", tone: 'code' },
                { name: 'bag', value: "<Bag 0x…9c>", tone: 'ptr' },
                { name: 'bag._items', value: "['apples', 'pears']", tone: 'data' },
              ],
              output: '',
            },
            {
              caption: 'len(bag) dispatches to __len__ with self = bag',
              note: 'There is no name lookup for `len`. CPython finds type(bag).__len__ and calls it with the instance. Same story for `in` calling __contains__ and `bag[i]` calling __getitem__ — that is all these lines are.',
              line: 19,
              vars: [
                { name: 'n', value: '2', tone: 'int' },
                { name: 'bag._items', value: "['apples', 'pears']", tone: 'data' },
              ],
              output: 'len(bag) -> Bag.__len__(bag) -> 2',
            },
            {
              caption: '`in` dispatches to __contains__, not to __iter__',
              note: 'Python prefers a dedicated __contains__ hook. Without one it would fall back to iterating — correct, but O(n) with an intermediate generator instead of whatever fast path your method can implement.',
              line: 20,
              vars: [
                { name: 'n', value: '2', tone: 'int' },
                { name: 'found', value: 'True', tone: 'ok' },
                { name: 'bag._items', value: "['apples', 'pears']", tone: 'data' },
              ],
              output: '"pears" in bag -> Bag.__contains__(bag, "pears") -> True',
            },
            {
              caption: 'bag[0] dispatches to __getitem__ with index = 0',
              note: 'This one method also gives you slicing (bag[0:1]), unpacking (a, b = bag) and iteration, because Python synthesises an iterator from a sequence-style __getitem__.',
              line: 21,
              vars: [
                { name: 'n', value: '2', tone: 'int' },
                { name: 'found', value: 'True', tone: 'ok' },
                { name: 'first', value: "'apples'", tone: 'ok' },
                { name: 'bag._items', value: "['apples', 'pears']", tone: 'data' },
              ],
              output: 'bag[0] -> Bag.__getitem__(bag, 0) -> "apples"',
            },
            {
              caption: 'print(bag) calls str(), which falls back to __repr__',
              note: 'Bag defines no __str__, so object.__str__ delegates to __repr__. That is why the output is the developer-facing form. If __repr__ were missing too, you would get <__main__.Bag object at 0x…9c> and learn why __repr__ is the one to always write.',
              line: 22,
              vars: [
                { name: 'n', value: '2', tone: 'int' },
                { name: 'found', value: 'True', tone: 'ok' },
                { name: 'first', value: "'apples'", tone: 'ok' },
                { name: 'bag._items', value: "['apples', 'pears']", tone: 'data' },
              ],
              output: "Bag(['apples', 'pears'])",
            },
          ],
        }),
        b.diagram(
          'C3 linearisation and the cooperative super() chain',
          `flowchart TD
    A["class D(B, C)"] --> B["L(B) = D + merge(L(B), L(C), [B, C])"]
    C["class B(A)"] --> C["L(B) = B + merge(L(A), [A]) = B, A, object"]
    D["class C(A)"] --> D["L(C) = C, A, object"]
    B --> E["L(D) = D, B, C, A, object"]
    E --> F["D().hello()"]
    F --> G["D.hello: 'D' + super()"]
    G --> H["next after D is B"]
    H --> I["B.hello: 'B' + super()"]
    I --> J["next after B is C<br/>(NOT A)"]
    J --> K["C.hello: 'C' + super()"]
    K --> L["next after C is A"]
    L --> M["A.hello: 'A' — no super(), chain ends"]
    M --> N["returns 'DBCA'"]`
        ),
        b.checklist('Inheritance rules worth memorising', [
          'A subclass that defines `__init__` shadows the parent `__init__` entirely — call `super().__init__(...)` explicitly',
          'Every mixin method that overrides something must call `super()` before returning, or the cooperative chain breaks',
          'List bases in priority order: `class Row(SerializableMixin, TimestampMixin)` changes behaviour order',
          'Prefer composition for structure ("has a") and inheritance only for genuine "is a" behaviour sharing',
          'Never call your own dunders directly — write `len(x)`, `x + y`, `x in y`, not `x.__len__()`',
          'If you define `__eq__` without `__hash__`, the object becomes unhashable and will not go in a set',
          'Run `print(Cls.__mro__)` whenever an inherited method is not being found where you expect it',
        ]),
        b.warn(
          'The silent __hash__ trap',
          'Define `__eq__` and you have, by definition, said that value equality is meaningful — so Python sets `__hash__ = None` and your instances become unhashable. `TypeError: unhashable type: MyRecord` then appears far away, usually as "cannot put these in a set". The fix is to implement `__hash__` yourself from the same fields `__eq__` uses, or to make the class `@dataclass(frozen=True)`, which does it correctly for you.'
        ),
        b.info(
          'When a metaclass is the right answer',
          'Metaclasses control class *creation* — they are how `enum.Enum`, `abc.ABCMeta` and `dataclasses` are themselves implemented. You need one when you must intercept every class definition in a library (ORM registration, plugin registries, declarative schemas). For application code, the alternatives are a class decorator, `__init_subclass__`, or a plain registry function, and all three are easier to read.'
        ),
      ],
      questions: [
        [
          'In the diamond `D(B, C)` where both B and C inherit A and each calls `super().hello()`, what does `super()` inside `B.hello` resolve to?',
          [
            'A, because B\'s only base class is A',
            'C, because super() follows D\'s MRO and the next entry after B is C',
            'B itself, restarting the method',
            'object, skipping both branches',
          ],
          1,
          '`super()` means "the next class in this object\'s MRO", not "my parent". Because D lists B before C, the linearisation is D, B, C, A, object, so B\'s super() lands on C and the chain runs once through each class. That is the cooperative design that makes mixins compose safely.',
        ],
        [
          'Why does defining `__eq__` on a class make its instances unhashable unless you also define `__hash__`?',
          [
            '`__eq__` returns a bool and bools cannot be hashed',
            'Defining __eq__ sets __hash__ to None, and an object with __hash__ = None cannot be a dict key or set member',
            'Hashing requires the object to be immutable, and __eq__ implies mutability',
            'Python hashes the output of __eq__, which is unhashable',
          ],
          1,
          'If two objects can be equal, objects that are equal must have equal hashes — otherwise a dict lookup would find different buckets for equal keys. Rather than guess a hash for your class, CPython makes the class unhashable so you are forced to state the rule. Implement __hash__ over the same fields as __eq__, or use @dataclass(frozen=True).',
        ],
        [
          'A class implements only `__getitem__`. Which of these still work?',
          [
            'Only subscripting; iteration and unpacking require an explicit __iter__',
            'Subscripting, slicing, iteration and unpacking, because Python synthesises an iterator from __getitem__',
            'Only subscripting with an integer; slices raise TypeError',
            'Nothing else — a dunder only ever fires for its own syntax',
          ],
          1,
          'When iter() finds no __iter__, the legacy path builds a sequence iterator that calls __getitem__(0), __getitem__(1), … until IndexError. That single method therefore also gives you the for loop, unpacking, and — because a slice is just passed through — slicing.',
        ],
        [
          'What is the practical consequence of a subclass defining `__init__` and forgetting `super().__init__(...)`?',
          [
            'Nothing; Python calls the parent constructor automatically afterwards',
            'The parent\'s __init__ never runs, so any attribute it sets is missing and later AttributeError appears in an unrelated method',
            'A TypeError is raised at class definition time',
            'The subclass instance is silently replaced by an instance of the parent class',
          ],
          1,
          'A subclass definition fully shadows the inherited __init__; nothing is chained implicitly. The failure is deferred: the object is built, is missing whatever the parent would have initialised, and the error surfaces at the first line that touches one of those attributes — usually far from the cause.',
        ],
      ],
    },
    {
      title: 'Dataclasses, properties and composition',
      summary: 'The dataclass options and the rules around them, properties with validation, __slots__, composition over inheritance, Enum and NamedTuple.',
      duration: 19,
      build: (b) => [
        b.md(`## @dataclass removes the boilerplate you should never have written

A class whose job is to hold data needs three methods: \`__init__\`, \`__repr__\`, and \`__eq__\`. You have written all three by hand dozens of times. The decorator writes them from the annotated attributes:`),
        b.code(`from dataclasses import dataclass


@dataclass
class Visitor:
    name: str
    visits: int = 0
    referred_by: str | None = None


v = Visitor("ada")
print(v)
# Visitor(name='ada', visits=0, referred_by=None)
print(v == Visitor("ada"))            # True — field-by-field equality
print(v.name, v.visits)              # ada 0`, 'visitor.py'),
        b.md(`
The rules, and they are all enforced by the decorator rather than by convention:

- **A field with a default cannot be followed by one without.** It is the same rule as ordinary function parameters, because the generated \`__init__\` is an ordinary function signature. If you hit \`TypeError: non-default argument follows default argument\`, reorder the fields or make the earlier ones keyword-only with \`@dataclass(kw_only=True)\`.
- **Mutable defaults are rejected**, because of exactly the shared-state bug from lesson one: \`items: list = []\` raises \`ValueError: mutable default <class 'list'> for field items is not allowed\`. The fix is \`field(default_factory=list)\`, which calls the factory once per instance.
- **Field order is the \`__init__\` parameter order**, so reordering fields is a breaking change for anyone calling positionally. \`kw_only=True\` makes every field keyword-only and buys you freedom to reorder later — worth it on any class that will live in a public API.
- **Annotations only, no values, for required fields.** \`name: str\` with no assignment produces a required parameter; \`name: str = "x"\` produces a default.

## The options, and what each one costs

| Argument | What you get | What it costs you |
| --- | --- | --- |
| *(none)* | \`__init__\`, \`__repr__\`, \`__eq__\` | the class is unhashable unless frozen |
| \`frozen=True\` | \`__setattr__\` raises \`FrozenInstanceError\`; adds \`__hash__\` | you cannot mutate fields, so no accumulators, no caches |
| \`order=True\` | \`__lt__\`/\`__le__\`/\`__gt__\`/\`__ge__\` from field order | sorting compares in declaration order, which is rarely the right total order |
| \`slots=True\` | no per-instance \`__dict__\`; ~30-40% less memory, faster attribute access | dynamic attributes are impossible; breaks subclasses not written for slots |
| \`eq=False\` | keeps identity equality | you almost never want this on a record |
| \`kw_only=True\` | every field keyword-only | no positional construction |
| \`repr=False\` on a field | that field is left out of \`__repr__\` | handy for secrets and large blobs, easy to forget |
| \`weakref_slot=True\` | the instance is weak-referenceable | only needed if something will weakly reference it |

A frozen dataclass is the cheapest way to get a hashable value type:`),
        b.code(`from dataclasses import dataclass


@dataclass(frozen=True)
class Version:
    major: int
    minor: int
    patch: int = 0


v = Version(3, 12, 4)
print(hash(v) == hash(Version(3, 12, 4)))    # True — usable as a dict key
print(sorted([Version(3, 12), Version(3, 9)], key=lambda t: (t.major, t.minor, t.patch)))
# [Version(major=3, minor=9, patch=0), Version(major=3, minor=12, patch=0)]

try:
    v.major = 4
except Exception as exc:
    print(type(exc).__name__)
# FrozenInstanceError`, 'frozen_version.py'),
        b.md(`
## __post_init__ for validation and derived fields

Everything that must be true after construction belongs in \`__post_init__\`, which the generated \`__init__\` calls as its last act:`),
        b.code(`from dataclasses import dataclass, field


@dataclass(frozen=True)
class Interval:
    start: float
    end: float
    tags: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.end < self.start:
            raise ValueError(f"end ({self.end}) must not precede start ({self.start})")
        object.__setattr__(self, "length", self.end - self.start)


Interval(0.0, 2.5).length      # 2.5
try:
    Interval(10.0, 1.0)
except ValueError as exc:
    print(exc)
# end (1.0) must not precede start (10.0)`, 'interval.py'),
        b.md(`
Two details in there that are worth the whole example. \`object.__setattr__(self, "length", ...)\` is how you set a derived field on a **frozen** dataclass — the frozen \`__setattr__\` blocks the normal path, and this is the documented escape hatch. And the derived field is not in the annotation list, so it is not a constructor parameter and not part of \`__eq__\`, which is usually what you want for a cache-like value.

Also worth knowing: a field whose annotation is \`ClassVar\` is skipped entirely, and one with \`field(init=False)\` is set by you rather than the caller:`),
        b.code(`from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class Registry:
    items: list[str] = field(default_factory=list)
    limit: ClassVar[int] = 1000          # not a field: never in __init__ or __eq__
    created: int = field(init=False, default=0)   # not a parameter; set below

    def __post_init__(self):
        object.__setattr__(self, "created", len(self.items))`, 'classvar_registry.py'),
        b.md(`
## Properties: computed values and validated writes

A \`@property\` is an attribute that runs code on read. With a setter it is also the only place you can enforce an invariant on assignment, without overriding \`__setattr__\`:`),
        b.code(`class Account:
    def __init__(self, owner, balance=0.0):
        self.owner = owner
        self._balance = float(balance)       # underscore: the real storage

    @property
    def balance(self):
        return self._balance

    @balance.setter
    def balance(self, amount):
        amount = float(amount)
        if amount < 0:
            raise ValueError(f"balance cannot go negative: {amount}")
        self._balance = amount

    @property
    def available(self):
        return self._balance * 0.9           # derived, read-only, no setter

    def __repr__(self):
        return f"Account({self.owner!r}, {self._balance:.2f})"


a = Account("ada", 100)
print(a.balance)      # 100.0 — property ran
a.balance = 50
print(a.balance)      # 50.0
try:
    a.balance = -1
except ValueError as exc:
    print(exc)
# balance cannot go negative: -1.0
try:
    a.available = 10
except AttributeError as exc:
    print(exc)
# can't set attribute`, 'account.py'),
        b.md(`
The discipline that keeps this clean: **the property is the public name, the underscore attribute is the storage, and no method ever reads \`self._balance\` when \`self.balance\` would do.** Properties are also the cheap caching mechanism — compute once, memoise in the underscore attribute, since the property is only called while that is \`None\`.

## Composition, and the two lightweight containers

Inheritance says *is a*. Composition says *has a*. Composition is almost always the better default in Python: it is a plain attribute, it works with any type including ones you do not control, it does not create a fake coupling to a base class, and it cannot produce the shared-mutable-state bugs that hierarchies invite.`),
        b.code(`import json
from dataclasses import dataclass


@dataclass
class SqlReportRenderer:
    dialect: str = "sqlite"

    def render(self, rows):
        body = ",\\n    ".join(f"({r['id']}, {r['label']!r})" for r in rows)
        header = f"-- {self.dialect}\\nSELECT * FROM items WHERE id IN ("
        return f"{header}\\n    {body}\\n);"


@dataclass
class JsonReportRenderer:
    indent: int = 2

    def render(self, rows):
        return json.dumps(rows, indent=self.indent, sort_keys=True)


@dataclass
class Report:
    title: str
    rows: list[dict]
    renderer: object            # any object with .render(rows)

    def run(self):
        return f"# {self.title}\\n{self.renderer.render(self.rows)}"


rows = [{"id": 1, "label": "widget"}, {"id": 2, "label": "sprocket"}]

json_report = Report("Quarterly", rows, JsonReportRenderer()).run()
print(json_report.splitlines()[:3])
# ['# Quarterly', '[', '  {']

sql_report = Report("Quarterly", rows, SqlReportRenderer()).run()
print(sql_report.splitlines()[1])
# -- sqlite
print(sql_report.splitlines()[2])
# SELECT * FROM items WHERE id IN (`, 'composition.py'),
        b.md(`
Swapping the output format is now a constructor argument rather than a new class. If the alternative were inheritance you would be writing \`class JsonReport(SqlReport)\` that overrides one method and undoes the other — the classic reason hierarchies rot.

Two containers that sit between dict and class:`),
        b.code(`from enum import Enum
from typing import NamedTuple


class Status(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    CLOSED = "closed"


print(Status("active") is Status.ACTIVE)     # True — value lookup works
print(Status.ACTIVE.value)                   # 'active'
print(list(Status))                          # [<Status.PENDING: 'pending'>, ...]
print(Status.ACTIVE == "active")             # False — it is not a str


class Point(NamedTuple):
    x: float
    y: float


p = Point(1.0, 2.0)
print(p.x, p.y, p + Point(0.5, 0.5))          # 1.0 2.0 Point(x=1.5, y=2.5)
print(tuple(p) == (1.0, 2.0))                 # True`, 'enum_namedtuple.py'),
        b.md(`
\`Enum\` is a closed set of named values that cannot be compared to strings by accident — which is precisely why \`Status.ACTIVE == "active"\` being \`False\` is a feature. \`NamedTuple\` is an immutable tuple with named fields: indexable, unpackable, hashable, and about as cheap as a bare tuple.

## When to write a class at all

The honest decision procedure, in order:

1. **It is a fixed record of related values with no behaviour** → \`NamedTuple\` (immutable) or \`@dataclass(frozen=True)\`.
2. **It is a bag of values that will grow, shrink or take arbitrary keys** → \`dict\`, or \`TypedDict\` if you want the keys checked.
3. **It is one of a known set of constants** → \`Enum\`.
4. **It has behaviour that the language should dispatch for you** (\`len\`, iteration, operators, \`with\`, \`==\`) → a class with the relevant dunders.
5. **It has invariants that must hold at all times** → a class with \`@property\` setters or \`__post_init__\` validation.
6. **Otherwise** → a function taking a dict. You can always promote it to a class later; you cannot easily un-inherit.

The anti-pattern to name is the **anemic domain model**: a class that stores data and nothing else, plus a separate layer of free functions doing the real work. If you find yourself writing \`def process_user(u): ...\` where \`u\` is always a \`User\`, that function wants to be a method.`),
        b.anim('step', {
          title: 'From a hand-written class to a dataclass',
          steps: [
            {
              title: 'What you would have written',
              desc: 'Forty lines of __init__ parameter plumbing, a __repr__ nobody enjoys formatting, and an __eq__ that forgets a field every time the shape changes. It is boilerplate with a bug count.',
              code_snippet: 'class Visitor:\n    def __init__(self, name, visits=0):\n        self.name = name\n        self.visits = visits\n\n    def __repr__(self):\n        return f"Visitor({self.name!r}, {self.visits!r})"\n\n    def __eq__(self, other):\n        return (self.name, self.visits) == (other.name, other.visits)',
            },
            {
              title: 'The same thing as a dataclass',
              desc: 'Three annotations become the constructor, the repr and the equality. The field list is the single source of truth, so adding a field updates all three generated methods at once — which is exactly the bug the hand-written version has.',
              code_snippet: '@dataclass\nclass Visitor:\n    name: str\n    visits: int = 0',
            },
            {
              title: 'Defaults have one rule you will hit immediately',
              desc: 'A field without a default cannot follow one with a default, because the generated __init__ is a normal Python signature. The error names the field, and the fix is to reorder or to make every field keyword-only.',
              code_snippet: '@dataclass\nclass Bad:\n    name: str = "anon"\n    visits: int          # TypeError: non-default argument follows default argument\n\n# Fix one: reorder, so every defaulted field comes last.\n@dataclass\nclass Reordered:\n    visits: int\n    name: str = "anon"\n\n# Fix two: keyword-only fields, which may be given defaults in any order.\n@dataclass(kw_only=True)\nclass KeywordOnly:\n    name: str = "anon"\n    visits: int = 0',
            },
            {
              title: 'Mutable defaults are refused on purpose',
              desc: '`items: list = []` raises at class-definition time, because the list would be created once and shared by every instance — the class-attribute bug from the first lesson, caught by the tool instead of by production.',
              code_snippet: 'items: list = []                    # ValueError: mutable default ... not allowed\nitems: list = field(default_factory=list)   # correct: called per instance',
            },
            {
              title: 'Frozen gives you hashability for free',
              desc: 'frozen=True blocks attribute assignment and, importantly, makes Python generate __hash__ from the field values. Value objects you can put in sets and use as dict keys cost one decorator argument.',
              code_snippet: '@dataclass(frozen=True)\nclass Version:\n    major: int\n    minor: int = 0\n\nhash(Version(3, 12)) == hash(Version(3, 12))   # True\nVersion(3, 12).major = 4                      # FrozenInstanceError',
            },
            {
              title: 'Everything else goes in __post_init__',
              desc: 'Validation and derived values live in __post_init__, which the generated __init__ calls last. On a frozen class you set derived attributes through object.__setattr__, the one documented escape hatch past the frozen guard.',
              code_snippet: 'def __post_init__(self):\n    if self.end < self.start:\n        raise ValueError("end must not precede start")\n    object.__setattr__(self, "length", self.end - self.start)',
            },
            {
              title: 'Slots are now one argument',
              desc: 'slots=True removes the per-instance __dict__, which is roughly a third less memory per instance and measurably faster attribute access. The price is that dynamic attributes become impossible, and so does naive subclassing.',
              code_snippet: '@dataclass(slots=True)\nclass Point:\n    x: float\n    y: float\n\nPoint(1, 2).label = "hero"   # AttributeError',
            },
          ],
        }),
        b.table(
          'Data structure decision table',
          ['If the thing is…', 'Reach for', 'Because'],
          [
            ['A fixed record, immutable', '`@dataclass(frozen=True)` or `NamedTuple`', 'Hashable, cheap, and the field list is the only place you edit'],
            ['A record with invariants', '`@dataclass` + `__post_init__`, or a `@property` setter', 'Fails at construction or assignment instead of three modules later'],
            ['A bag of arbitrary keys', '`dict` (or `TypedDict` for checking)', 'No ceremony; JSON-shaped data needs no class at all'],
            ['A closed set of constants', '`Enum`', 'Cannot be compared to the raw string by accident; switch statements stay exhaustive'],
            ['Something the language must dispatch on', 'A class with `__len__`/`__iter__`/`__eq__`/`__enter__`', 'Gains syntax (`len`, `for`, `==`, `with`) instead of ad-hoc helper functions'],
            ['One of several interchangeable strategies', 'Composition: hold the strategy as a field', 'Swapping is a constructor argument, not a new subclass'],
            ['A behaviour you want to mix into many types', 'A small mixin using `super()`', 'Adds capability without a deep is-a hierarchy'],
          ]
        ),
        b.tip(
          'A dataclass is also a free type hint',
          'Annotating fields is what makes a dataclass worth having beyond the boilerplate: `def summarise(v: Visitor) -> str:` now carries real information for a type checker and for the next reader, and `dataclasses.fields(Visitor)` can generate a serialiser at runtime. Untyped attributes cost nothing to annotate now, so there is no reason not to.',
        ),
        b.warn(
          'Do not put a behaviour you always want into __init__',
          'Constructors should build the object, nothing else. A dataclass whose `__post_init__` opens a socket, writes a row or sleeps will make every test that instantiates it slow and order-dependent, and will make `copy.deepcopy` surprising. Do the work in an explicit `connect()` or `save()`, or in `__post_init__` only if it is pure and cheap — validation, normalisation, derived fields.',
        ),
      ],
      questions: [
        [
          'Why does `@dataclass` reject `items: list = []` with a ValueError?',
          [
            'Lists cannot be used as defaults because they are unhashable',
            'A mutable default in the class body is created once and shared by every instance, which is the shared-state bug the dataclass is meant to prevent',
            'Dataclasses require every mutable field to be keyword-only',
            'The decorator cannot tell whether a default list will be mutated',
          ],
          1,
          'The same hazard as a mutable default argument, and Python 3.11+ rejects the form explicitly rather than leaving it to bite you. field(default_factory=list) calls the factory once per instance, so each object gets its own list. Accepting it silently would have made the generated __init__ the single most common source of cross-instance contamination in Python code.',
        ],
        [
          'What does `@dataclass(frozen=True)` buy you that the default does not?',
          [
            'Faster attribute access, because instances get __slots__ automatically',
            'Immutable instances plus a generated __hash__, which makes the objects usable as dict keys and set members',
            'Automatic conversion of nested dataclasses to tuples',
            'The ability to inherit from the class without inheriting its __init__',
          ],
          1,
          'Frozen blocks __setattr__, which is what makes the object value-like, and CPython generates __hash__ from the field tuple as part of that. The default dataclass sets __hash__ to None because a mutable value cannot have a stable hash, so instances are unhashable. slots is a separate, independent argument — the two are often combined but solve different problems.',
        ],
        [
          'Why is `self._balance` stored with a leading underscore when `@property def balance` exists?',
          [
            'To mark it private, since Python has no real privacy',
            'Because a property is a data descriptor and outranks the instance dict, so the property and an attribute of the same name would collide',
            'Because properties cannot read instance attributes',
            'It is required by PEP 8 for backing attributes',
          ],
          1,
          'Attribute lookup consults data descriptors on the type before the instance __dict__. So `self.balance = x` in __init__ would not store anything in the dict — it would invoke the property\'s setter (or raise AttributeError if there is none). The underscore-prefixed storage name avoids the collision and makes the public name unambiguously the property.',
        ],
        [
          'A class needs to render a report as JSON, CSV or SQL, and the three formats share almost nothing. What is the right design?',
          [
            'Subclass a Report base class three times, overriding the render method',
            'Give Report a renderer field holding any object with a render(rows) method, and pass the implementation in',
            'Add an if/elif/else chain inside Report.render keyed on a format string',
            'Make render a module-level function that takes the format as its first argument alongside the report',
          ],
          1,
          'The three renderers are strategies, not kinds of report. Composition makes the choice a constructor argument, keeps each implementation independently testable, and avoids a hierarchy in which JsonReport inherits behaviour from SqlReport that it must actively undo. The if/elif option is the one that grows a new branch every time a format is added.',
        ],
      ],
    },
  ]
);
