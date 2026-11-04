/** Milestone 3 (4 Dec 2026): Modules 7–8, networking and UIKit. Practice questions, not past papers. */
import { qsFor, type WLesson, type WQuestion } from './types';

export const M3_LESSONS: WLesson[] = [
  {
    m: 'm3', module: 7, title: 'URLSession HTTP Networking', doc: ['Apple: URLSession', 'https://developer.apple.com/documentation/foundation/urlsession'],
    what: 'URLSession is Foundation’s API for HTTP: GET and POST requests, downloads and uploads. You build a URLRequest, send it, then check the HTTP status before using the data.',
    rules: [
      'Simple: `URLSession.shared`; async: `let (data, response) = try await URLSession.shared.data(for: request)`',
      '`URLRequest`: set `httpMethod`, headers with `setValue(_:forHTTPHeaderField:)`, and `httpBody` for POST',
      'An HTTP error (404, 500) does NOT throw: cast to `HTTPURLResponse` and check that `statusCode` is in `200..<300`',
      'Completion-handler `dataTask` must be started with `.resume()`, and its handler runs on a background queue',
      'App Transport Security blocks plain `http://` by default; use HTTPS',
    ],
    examples: [
      'func fetchUsers() async throws -> [User] {\n    let url = URL(string: "https://api.example.com/users")!\n    let (data, response) = try await URLSession.shared.data(from: url)\n    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {\n        throw APIError.badStatus\n    }\n    return try JSONDecoder().decode([User].self, from: data)\n}',
      'var req = URLRequest(url: loginURL)\nreq.httpMethod = "POST"\nreq.setValue("application/json", forHTTPHeaderField: "Content-Type")\nreq.httpBody = try JSONEncoder().encode(Credentials(email: e, password: p))\nlet (data, _) = try await URLSession.shared.data(for: req)',
    ],
    trap: 'With the old completion-handler API, forgetting `.resume()` means the request never starts, with no error at all.',
    task: 'Fetch https://jsonplaceholder.typicode.com/todos/1 in a playground and print the status code and body.',
  },
  {
    m: 'm3', module: 7, title: 'JSON Parsing with Codable Protocol', doc: ['Apple: Codable', 'https://developer.apple.com/documentation/swift/codable'],
    what: '`Codable` (= `Encodable & Decodable`) lets the compiler generate JSON conversion for your types. JSONDecoder turns Data into structs, and JSONEncoder turns structs into Data.',
    rules: [
      'Conform: `struct User: Codable { let id: Int; let name: String }`; every property must be Codable too',
      'Different key names: a `CodingKeys` enum, or `decoder.keyDecodingStrategy = .convertFromSnakeCase`',
      'A missing key for a non-optional property throws `keyNotFound`; make it Optional if it may be absent',
      'Wrong type (`"age": "22"` for an Int) throws `typeMismatch`',
      'Arrays: `decode([User].self, from:)`; dates: `decoder.dateDecodingStrategy = .iso8601`',
    ],
    examples: [
      'struct Product: Codable {\n    let id: Int\n    let title: String\n    let price: Double\n    let imageURL: URL?\n    enum CodingKeys: String, CodingKey {\n        case id, title, price\n        case imageURL = "image_url"\n    }\n}\nlet products = try JSONDecoder().decode([Product].self, from: data)',
      'do {\n    _ = try JSONDecoder().decode(User.self, from: data)\n} catch let DecodingError.keyNotFound(key, _) {\n    print("Missing key:", key.stringValue)   // tells you exactly what broke\n}',
    ],
    trap: 'Printing only `error.localizedDescription` for a decoding error hides the real cause. Print the whole `error` to see which key or type failed.',
    task: 'Decode a JSON array of 3 movies with a snake_case field and one optional field.',
  },
  {
    m: 'm3', module: 8, title: 'UIView & UIViewController Hierarchy', doc: ['Apple: UIViewController', 'https://developer.apple.com/documentation/uikit/uiviewcontroller'],
    what: 'UIKit screens are trees. Each UIViewController owns a root `view`, views contain subviews, and view controllers can contain child view controllers (navigation, tabs, containers).',
    rules: [
      '`addSubview` puts a view on top of its existing siblings; `removeFromSuperview` takes it out',
      '`frame`: position and size in the superview’s coordinates; `bounds`: the view’s own coordinate space',
      '`clipsToBounds = true` hides any part of a subview outside the view',
      'Navigation: `navigationController?.pushViewController(vc, animated: true)`; modal: `present(vc, animated: true)`',
      'Child VC: `addChild(child)` → `view.addSubview(child.view)` → `child.didMove(toParent: self)`',
    ],
    examples: [
      'let card = UIView(frame: CGRect(x: 20, y: 100, width: 200, height: 120))\ncard.backgroundColor = .systemBlue\ncard.layer.cornerRadius = 12\nview.addSubview(card)\nlet badge = UILabel()\nbadge.text = "NEW"\ncard.addSubview(badge)   // badge is inside card, drawn on top of it',
      'let detail = DetailViewController(item: item)\nnavigationController?.pushViewController(detail, animated: true)   // back button for free\n// or a sheet:\npresent(detail, animated: true)',
    ],
    trap: '`pushViewController` does nothing if the current VC is not inside a UINavigationController: `navigationController` is nil, and the optional chain fails silently.',
    task: 'Embed a VC in a navigation controller, push a second VC from a button, and present a third one modally.',
  },
  {
    m: 'm3', module: 8, title: 'Storyboards, IBOutlets & IBActions', doc: ['Apple: UIKit', 'https://developer.apple.com/documentation/uikit'],
    what: 'A storyboard designs screens visually in Interface Builder. IBOutlets connect a view in the storyboard to a property in code; IBActions connect a control’s event to a method.',
    rules: [
      '`@IBOutlet weak var nameLabel: UILabel!`: the `!` is there because it is set after init, when the view loads',
      '`@IBAction func saveTapped(_ sender: UIButton)` runs for the connected control event',
      'Set the scene’s Custom Class to your VC subclass, or the outlets cannot connect',
      'Load from code: `UIStoryboard(name: "Main", bundle: nil).instantiateViewController(withIdentifier: "Detail")`, which needs a Storyboard ID',
      'Segues: pass data in `prepare(for:sender:)`',
    ],
    examples: [
      'class ProfileVC: UIViewController {\n    @IBOutlet weak var nameLabel: UILabel!\n    var userName = ""\n    override func viewDidLoad() {\n        super.viewDidLoad()\n        nameLabel.text = userName   // outlets are ready here\n    }\n    @IBAction func editTapped(_ sender: UIButton) { /* … */ }\n}',
      'override func prepare(for segue: UIStoryboardSegue, sender: Any?) {\n    if let vc = segue.destination as? ProfileVC {\n        vc.userName = "Asha"   // set data, NOT vc.nameLabel.text (outlets are nil now)\n    }\n}',
    ],
    trap: 'Rename an outlet in code without reconnecting it, and the app crashes with “this class is not key value coding-compliant for the key …”. Fix the connection in the Connections inspector.',
    task: 'Build a two-screen storyboard app that passes a name through a segue.',
  },
  {
    m: 'm3', module: 8, title: 'Auto Layout & Layout Constraints', doc: ['Apple: Auto Layout Guide', 'https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/'],
    what: 'Auto Layout positions views with constraints (rules) instead of fixed frames, so the same screen fits every iPhone, iPad, orientation and text size.',
    rules: [
      'Each view needs enough constraints for x, y, width and height, or it is ambiguous',
      'In code: `translatesAutoresizingMaskIntoConstraints = false`, then `NSLayoutConstraint.activate([...])`',
      'Intrinsic content size: labels and buttons size themselves from their content',
      'Content hugging resists growing bigger; compression resistance resists shrinking (raise it to stop truncation)',
      'Pin to `view.safeAreaLayoutGuide` to avoid the notch and the home indicator; UIStackView cuts the constraint count',
    ],
    examples: [
      'let box = UIView()\nbox.translatesAutoresizingMaskIntoConstraints = false\nview.addSubview(box)\nNSLayoutConstraint.activate([\n    box.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),\n    box.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),\n    box.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),\n    box.heightAnchor.constraint(equalToConstant: 120)\n])',
      'Two labels side by side, and the left one gets truncated: raise the left label’s horizontal compression resistance (for example to 751), or lower the right one’s.',
    ],
    trap: 'Forgetting `translatesAutoresizingMaskIntoConstraints = false` adds automatic constraints that fight yours, giving “Unable to simultaneously satisfy constraints” in the console.',
    task: 'Lay out a login form (two fields and a button) centred, with 20-point margins, that works in both portrait and landscape.',
  },
  {
    m: 'm3', module: 8, title: 'UI Controls & UITableView', doc: ['Apple: UITableView', 'https://developer.apple.com/documentation/uikit/uitableview'],
    what: 'UIControls (UIButton, UISwitch, UISlider, UITextField, UISegmentedControl) send events. UITableView shows a scrolling list of rows and reuses cells for speed.',
    rules: [
      'Control events: UIButton `.touchUpInside`; UISwitch, UISlider and UISegmentedControl `.valueChanged`; UITextField `.editingChanged`',
      'DataSource (required): `numberOfRowsInSection` and `cellForRowAt`',
      'Delegate: `didSelectRowAt`, `heightForRowAt`, swipe actions',
      '`dequeueReusableCell(withIdentifier:for:)` reuses off-screen cells; set EVERY property each time, or reset in `prepareForReuse`',
      'After changing the data array: `reloadData()`, or `insertRows`/`deleteRows` for animation',
    ],
    examples: [
      'extension ContactsVC: UITableViewDataSource, UITableViewDelegate {\n    func tableView(_ t: UITableView, numberOfRowsInSection s: Int) -> Int { contacts.count }\n    func tableView(_ t: UITableView, cellForRowAt ip: IndexPath) -> UITableViewCell {\n        let cell = t.dequeueReusableCell(withIdentifier: "Cell", for: ip)\n        var c = cell.defaultContentConfiguration()\n        c.text = contacts[ip.row].name\n        cell.contentConfiguration = c\n        return cell\n    }\n    func tableView(_ t: UITableView, didSelectRowAt ip: IndexPath) {\n        t.deselectRow(at: ip, animated: true)\n        open(contacts[ip.row])\n    }\n}',
      'darkModeSwitch.addTarget(self, action: #selector(toggled(_:)), for: .valueChanged)\n@objc func toggled(_ s: UISwitch) { settings.dark = s.isOn }',
    ],
    trap: 'Setting a checkmark only `if item.done` leaves stale checkmarks on reused cells. Always set both branches: `cell.accessoryType = item.done ? .checkmark : .none`.',
    task: 'Build a to-do table with add, delete (swipe) and a checkmark toggle on tap.',
  },
];

const q = (lesson: string) => qsFor('m3', lesson);
const net = q('URLSession HTTP Networking');
const cod = q('JSON Parsing with Codable Protocol');
const hier = q('UIView & UIViewController Hierarchy');
const sb = q('Storyboards, IBOutlets & IBActions');
const al = q('Auto Layout & Layout Constraints');
const tv = q('UI Controls & UITableView');

export const M3_QUESTIONS: WQuestion[] = [
  net('beginner', 'You create a URLSession dataTask with a completion handler, but nothing happens. Most likely cause?', ['The URL is a String', 'You never called .resume() on the task', 'URLSession needs a delegate', 'The handler must be @escaping'], 1, 'Tasks are created suspended. resume() starts them.'),
  net('intermediate', 'On which queue does a URLSession.shared dataTask completion handler run?', ['Always the main queue', 'A background queue, so dispatch to main before touching the UI', 'The queue that created the task', 'A serial queue you pass in'], 1, 'The handler runs on the session’s delegate queue (a background queue for .shared).'),
  net('intermediate', 'The server answers 404 Not Found. What does `try await URLSession.shared.data(from: url)` do?', ['Throws an error', 'Returns normally with the data and response; you must check statusCode yourself', 'Returns nil', 'Retries automatically'], 1, 'Only transport failures (no network, timeout) throw. Every HTTP status counts as a completed response.'),
  net('beginner', 'Which is needed to send JSON in a POST request?', ['Only the URL', 'httpMethod = "POST", a Content-Type: application/json header, and httpBody with the encoded JSON', 'A GET request with a body', 'URLSession.post()'], 1, 'Configure a URLRequest with the method, the header and the body.'),
  net('intermediate', 'Loading `http://api.example.com` fails with an ATS error. Why?', ['Bad JSON', 'App Transport Security requires HTTPS by default', 'The simulator has no network', 'URLSession only supports GET'], 1, 'ATS blocks insecure HTTP unless an exception is added in Info.plist (NSAppTransportSecurity).'),
  net('advanced', 'let (_, response) = try await URLSession.shared.data(from: url)\nlet code = (response as? HTTPURLResponse)?.statusCode ?? 0\nprint((200..<300).contains(code))\n\nThe server answered 204 No Content. What is printed?', ['true', 'false', '204', 'It throws, because there is no body'], 0, '204 is a success status (in 200..<300). An empty body is fine.'),

  cod('beginner', 'What is Codable?', ['A class for JSON', 'A typealias for Encodable & Decodable', 'A JSON library you must install', 'A protocol only for classes'], 1, 'Codable = Encodable & Decodable, and the compiler can synthesise both.'),
  cod('intermediate', 'The JSON has "user_name" but your property is `userName`. Which works?', ['Nothing; rename the property', 'A CodingKeys enum, or decoder.keyDecodingStrategy = .convertFromSnakeCase', 'Make it Optional', 'Use a class'], 1, 'Map the keys with CodingKeys, or let the decoder convert snake_case automatically.'),
  cod('intermediate', 'struct User: Codable { let name: String; let age: Int }\nThe JSON is {"name":"Asha"}. What happens on decode?', ['age becomes 0', 'It throws DecodingError.keyNotFound for "age"', 'age becomes nil', 'Compile error'], 1, 'Non-optional properties need their key. Make age `Int?` if it may be missing.'),
  cod('intermediate', 'struct User: Codable { let name: String; let age: Int? }\nlet json = #"{"name":"Asha"}"#.data(using: .utf8)!\nlet u = try JSONDecoder().decode(User.self, from: json)\nprint(u.age as Any)\n\nWhat is printed?', ['0', 'nil', 'Optional(0)', 'It throws'], 1, 'An Optional property with a missing key decodes as nil.'),
  cod('beginner', 'The server returns a JSON array of users. How do you decode it?', ['decode(User.self, from: data)', 'decode([User].self, from: data)', 'decode(Array.self, from: data)', 'JSONSerialization only'], 1, 'Arrays of Codable types are Codable, so ask for [User].self.'),
  cod('advanced', 'The JSON has "age": "22" (a string) and your property is `let age: Int`. What happens?', ['age = 22', 'It throws DecodingError.typeMismatch', 'age = nil', 'age = 0'], 1, 'The decoder does not convert strings to numbers. Fix the API or write a custom init(from:).'),
  cod('intermediate', 'Dates arrive as "2026-11-15T09:30:00Z". What decodes them into `Date`?', ['Nothing; use String', 'decoder.dateDecodingStrategy = .iso8601', 'Date is not Codable', 'keyDecodingStrategy'], 1, 'The .iso8601 strategy parses ISO 8601 date strings. The default expects seconds as a number.'),

  hier('beginner', 'What is the root view of a UIViewController called?', ['rootView', 'view', 'window', 'mainView'], 1, 'Every UIViewController has a `view` property, which is the top of its view hierarchy.'),
  hier('beginner', 'You call view.addSubview(a) and then view.addSubview(b), and they overlap. Which one is on top?', ['a', 'b', 'Whichever is smaller', 'Neither is shown'], 1, 'Subviews are drawn in order, so the last one added is on top (bringSubviewToFront can change that).'),
  hier('intermediate', 'What is the difference between frame and bounds?', ['They are always equal', 'frame is in the superview’s coordinates; bounds is in the view’s own coordinates (origin usually 0,0)', 'bounds includes subviews', 'frame is only for layers'], 1, 'frame places the view inside its parent, and bounds describes its own drawing space.'),
  hier('intermediate', 'navigationController?.pushViewController(vc, animated: true) does nothing at all. Why?', ['vc is a struct', 'The current VC is not embedded in a UINavigationController, so navigationController is nil', 'animated must be false', 'push only works with storyboards'], 1, 'Optional chaining on nil silently does nothing. Embed the VC in a navigation controller, or present it instead.'),
  hier('advanced', 'What is the correct order to add a child view controller?', ['addSubview(child.view), then addChild', 'addChild(child) → view.addSubview(child.view) → child.didMove(toParent: self)', 'present(child)', 'child.didMove first'], 1, 'This order keeps the containment and appearance callbacks correct.'),
  hier('intermediate', 'A subview sticks out past its parent’s edges. Which property hides the overflow?', ['isHidden', 'clipsToBounds = true', 'alpha = 0', 'isOpaque'], 1, 'clipsToBounds (masksToBounds on the layer) clips subviews to the parent’s bounds.'),

  sb('beginner', 'What is an @IBOutlet?', ['A method called on tap', 'A property in code connected to a view in the storyboard', 'A segue', 'A storyboard file'], 1, 'Outlets let code reach views designed in Interface Builder. Actions go the other way.'),
  sb('intermediate', 'The app crashes on launch with “this class is not key value coding-compliant for the key titleLabel”. Cause?', ['Wrong font', 'A broken outlet connection: the outlet was renamed or deleted in code but is still connected in the storyboard', 'Missing Info.plist key', 'Auto Layout conflict'], 1, 'Remove the stale connection in the Connections inspector and reconnect it.'),
  sb('beginner', 'What is an @IBAction?', ['A property for a view', 'A method that runs when a connected control sends an event', 'A storyboard ID', 'A constraint'], 1, 'For example, a button’s Touch Up Inside calls the @IBAction method.'),
  sb('intermediate', 'Why are outlets usually declared `@IBOutlet weak var label: UILabel!`?', ['Labels are always nil', 'The outlet is set after init (when the view loads), so it cannot be a plain non-optional', '! makes it faster', 'weak is required by Swift'], 1, 'The implicitly unwrapped optional is nil until the view loads. weak is fine because the view hierarchy holds the label strongly.'),
  sb('advanced', 'In prepare(for:sender:) you write `(segue.destination as! ProfileVC).nameLabel.text = "Asha"` and it crashes. Why?', ['Wrong segue', 'The destination’s view has not loaded yet, so its outlets are nil; pass the data in a plain property instead', 'Labels cannot change', 'You must use push'], 1, 'Set `vc.userName = "Asha"`, then assign it to the label in the destination’s viewDidLoad.'),
  sb('intermediate', 'instantiateViewController(withIdentifier: "Detail") crashes with “no view controller with identifier”. What did you forget?', ['To import UIKit', 'To set “Detail” as the Storyboard ID of that scene', 'To call resume()', 'To add a segue'], 1, 'Set the Storyboard ID in the Identity inspector, spelled exactly the same.'),

  al('beginner', 'Creating constraints in code, what must you set on the view first?', ['isHidden = false', 'translatesAutoresizingMaskIntoConstraints = false', 'clipsToBounds = true', 'frame = .zero'], 1, 'Otherwise UIKit adds autoresizing constraints that conflict with yours.'),
  al('intermediate', 'What must Auto Layout be able to work out for every view to avoid ambiguity?', ['Only width', 'Horizontal position, vertical position, width and height', 'Only top and left', 'Colour'], 1, 'Each axis needs a position and a size, given directly or from intrinsic content size.'),
  al('intermediate', 'The console says “Unable to simultaneously satisfy constraints.” What does it mean?', ['Missing constraints', 'Conflicting constraints; UIKit breaks one of them at run time', 'The view is hidden', 'Auto Layout is off'], 1, 'Two or more required constraints cannot all be true. Find them using the identifiers in the log.'),
  al('advanced', 'Two labels sit side by side. The left one gets truncated, but you want the right one to shrink instead. What do you change?', ['Raise the right label’s hugging priority', 'Raise the LEFT label’s compression resistance (or lower the right one’s)', 'Set both widths to 0', 'Remove the trailing constraint'], 1, 'Compression resistance decides which view gives up space first when there is not enough room.'),
  al('beginner', 'How do you keep content away from the notch and the home indicator?', ['Hard-code a 44-point top margin', 'Constrain to view.safeAreaLayoutGuide', 'Use a frame', 'Hide the status bar'], 1, 'The safe area adapts to every device and orientation.'),
  al('intermediate', 'NSLayoutConstraint.activate([\n    box.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),\n    box.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)\n])\n\nThe view is 390 points wide. How wide is box?', ['390', '370', '350', '410'], 2, 'A 20-point inset on each side: 390 − 20 − 20 = 350. (A trailing constant is negative to move inward.)'),
  al('beginner', 'What is intrinsic content size?', ['The screen size', 'The natural size a view wants for its content (for example a label’s text)', 'The frame set in code', 'The safe area'], 1, 'Labels, buttons and image views report it, so they often need only position constraints.'),

  tv('beginner', 'Which two UITableViewDataSource methods are required?', ['didSelectRowAt and heightForRowAt', 'numberOfRowsInSection and cellForRowAt', 'viewDidLoad and reloadData', 'numberOfSections and titleForHeader'], 1, 'The table must know how many rows there are and which cell to show for each.'),
  tv('intermediate', 'Why use dequeueReusableCell instead of creating a new cell for every row?', ['It is required by Swift', 'It reuses cells that scrolled off screen, keeping memory and scrolling smooth', 'It sorts the rows', 'It loads data'], 1, 'Only about one screen of cells exists at a time; they are recycled as you scroll.'),
  tv('advanced', 'While scrolling fast, checkmarks show up on the wrong rows. Most likely cause?', ['The data is wrong', 'Cell reuse: the code sets the checkmark when done but never clears it when not done', 'reloadData is missing', 'Too many rows'], 1, 'Set every property in both branches, or reset it in prepareForReuse.'),
  tv('beginner', 'Where do you handle a tap on a row?', ['cellForRowAt', 'UITableViewDelegate tableView(_:didSelectRowAt:)', 'numberOfRowsInSection', 'viewWillAppear'], 1, 'Selection is a delegate callback.'),
  tv('intermediate', 'You append an item to the array, but the table does not show it. What is missing?', ['Nothing; it updates itself', 'Call tableView.reloadData() (or insertRows(at:with:))', 'Restart the app', 'Call viewDidLoad again'], 1, 'UITableView does not watch your array. Tell it the data changed.'),
  tv('beginner', 'Which event fires when a user flips a UISwitch?', ['.touchUpInside', '.valueChanged', '.editingChanged', '.touchDown'], 1, 'Switches, sliders, steppers and segmented controls send .valueChanged. Buttons use .touchUpInside.'),
  tv('intermediate', 'Which control event fires on each keystroke in a UITextField?', ['.valueChanged', '.editingChanged', '.touchUpInside', '.editingDidEnd'], 1, '.editingChanged fires as the text changes. .editingDidEnd fires when the field loses focus.'),
];
