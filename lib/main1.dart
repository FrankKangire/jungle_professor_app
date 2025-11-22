olympic@olympic-book:~/jungle_professor$ cat lib/main.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';

// --- LIVE SERVER CONFIGURATION ---
const String PHP_API_URL = "https://jungle-professor-api.onrender.com";
const String WEBSOCKET_URL = "wss://jungle-professor-game-server.onrender.com";

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SharedPreferences prefs = await SharedPreferences.getInstance();
  String? username = prefs.getString('username');
  runApp(MyApp(initialRoute: username == null ? '/' : '/welcome'));
}

class MyApp extends StatelessWidget {
  final String initialRoute;
  const MyApp({Key? key, required this.initialRoute}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jungle Professor',
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.grey[200],
        primarySwatch: Colors.blueGrey,
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.blueGrey[900],
          foregroundColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blueGrey[800],
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
            textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
      initialRoute: initialRoute,
      routes: {
        '/': (context) => const HomePage(),
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/welcome': (context) => const WelcomePage(),
        '/select_game': (context) => const GameSelectionPage(),
        '/animal_select': (context) => const AnimalSelectionPage(),
        '/saved_results': (context) => const SavedResultsListPage(),
      },
    );
  }
}

enum MenuAction { home, signup, login, logout, myResults }

class AppMenu extends StatelessWidget implements PreferredSizeWidget {
  final List<MenuAction> actions;
  final String title;

  const AppMenu({Key? key, required this.title, required this.actions}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      actions: [
        PopupMenuButton<MenuAction>(
          onSelected: (MenuAction action) async {
            switch (action) {
              case MenuAction.home:
                Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
                break;
              case MenuAction.login:
                Navigator.of(context).pushNamed('/login');
                break;
              case MenuAction.signup:
                Navigator.of(context).pushNamed('/signup');
                break;
              case MenuAction.logout:
                final prefs = await SharedPreferences.getInstance();
                await prefs.remove('username');
                Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                break;
              case MenuAction.myResults:
                Navigator.of(context).pushNamed('/saved_results');
                break;
            }
          },
          itemBuilder: (BuildContext context) {
            return actions.map((MenuAction choice) {
              String text = '';
              switch (choice) {
                case MenuAction.home:
                  text = 'Home';
                  break;
                case MenuAction.login:
                  text = 'Login';
                  break;
                case MenuAction.signup:
                  text = 'Sign Up';
                  break;
                case MenuAction.logout:
                  text = 'Logout';
                  break;
                case MenuAction.myResults:
                  text = 'My Results';
                  break;
              }
              return PopupMenuItem<MenuAction>(
                value: choice,
                child: Text(text),
              );
            }).toList();
          },
        ),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppMenu(title: 'Jungle Professor', actions: [MenuAction.login, MenuAction.signup]),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.park, size: 100, color: Colors.green[800]),
              const SizedBox(height: 20),
              Text(
                'Welcome!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.grey[800]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              const Text(
                'Please login or sign up to play.',
                style: TextStyle(fontSize: 18),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({Key? key}) : super(key: key);
  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    if (_usernameController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill in all fields.')));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$PHP_API_URL/login.php'),
        body: {
          'username': _usernameController.text,
          'password': _passwordController.text,
        },
      );
      if (mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('username', data['username']);
          Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['message'])));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error: Could not connect to server.')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppMenu(title: 'Login', actions: [MenuAction.home, MenuAction.signup]),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _usernameController, decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _passwordController, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(onPressed: _login, child: const Text('Login')),
          ],
        ),
      ),
    );
  }
}

class SignupPage extends StatefulWidget {
  const SignupPage({Key? key}) : super(key: key);
  @override
  _SignupPageState createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _signup() async {
    if (_usernameController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill in all fields.')));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$PHP_API_URL/signup.php'),
        body: {
          'username': _usernameController.text,
          'password': _passwordController.text,
        },
      );
      if (mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('username', data['username']);
          Navigator.of(context).pushNamedAndRemoveUntil('/animal_select', (route) => false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['message'])));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error: Could not connect to server.')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppMenu(title: 'Sign Up', actions: [MenuAction.home, MenuAction.login]),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _usernameController, decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _passwordController, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(onPressed: _signup, child: const Text('Sign Up')),
          ],
        ),
      ),
    );
  }
}

class WelcomePage extends StatefulWidget {
  const WelcomePage({Key? key}) : super(key: key);
  @override
  _WelcomePageState createState() => _WelcomePageState();
}

class _WelcomePageState extends State<WelcomePage> {
  String _username = 'Player';

  @override
  void initState() {
    super.initState();
    _loadUsername();
  }

  Future<void> _loadUsername() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _username = prefs.getString('username') ?? 'Player';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppMenu(title: 'Jungle Professor', actions: const [MenuAction.myResults, MenuAction.logout]),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Welcome, $_username!', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, '/select_game');
              },
              child: const Text('Choose Game'),
            ),
          ],
        ),
      ),
    );
  }
}

class GameSelectionPage extends StatefulWidget {
  const GameSelectionPage({Key? key}) : super(key: key);
  @override
  _GameSelectionPageState createState() => _GameSelectionPageState();
}

class _GameSelectionPageState extends State<GameSelectionPage> {
  String _statusMessage = '';
  bool _isFindingGame = false;

  WebSocketChannel? _channel;
  StreamController<String>? _broadcastController;
  StreamSubscription? _streamListener;
  String? _clientId;
  String? _playerIdentifier;
  bool _connectionHandedOff = false;

  @override
  void dispose() {
    if (!_connectionHandedOff) {
      _streamListener?.cancel();
      _broadcastController?.close();
      _channel?.sink.close();
    }
    super.dispose();
  }

  void _findGame(String gameType) {
    setState(() {
      _isFindingGame = true;
      _statusMessage = 'Connecting to game server...';
      _connectionHandedOff = false;
    });

    _channel = WebSocketChannel.connect(Uri.parse(WEBSOCKET_URL));
    _broadcastController = StreamController<String>.broadcast();

    _channel!.stream.listen(
      (message) {
        if (!(_broadcastController?.isClosed ?? true)) _broadcastController!.add(message);
      },
      onDone: () {
        if (mounted && !_connectionHandedOff) {
          setState(() {
            _isFindingGame = false;
            _statusMessage = 'Connection lost. Please try again.';
          });
        }
        if (!(_broadcastController?.isClosed ?? true)) _broadcastController!.close();
      },
      onError: (error) {
        if (mounted && !_connectionHandedOff) {
          setState(() {
            _isFindingGame = false;
            _statusMessage = 'Connection error.';
          });
        }
        if (!(_broadcastController?.isClosed ?? true)) _broadcastController!.addError(error);
      },
    );

    _streamListener = _broadcastController!.stream.listen((message) {
      if (!mounted) return;
      final data = jsonDecode(message);
      final method = data['method'];

      if (method == 'connect') {
        _clientId = data['clientId'];
        setState(() => _statusMessage = 'Finding a $gameType game...');
        _channel!.sink.add(jsonEncode({
          'method': 'find_game',
          'clientId': _clientId,
          'gameType': gameType
        }));
      } else if (method == 'join') {
        _playerIdentifier = data['player'];
        setState(() => _statusMessage = 'Joined Game! Select your animal...');
        // Navigate to animal selection
        Navigator.pushReplacementNamed(
          context,
          '/animal_select',
          arguments: {
            'channel': _channel,
            'stream': _broadcastController!.stream,
            'clientId': _clientId,
            'player': _playerIdentifier,
            'gameId': data['game']['id'],
            'gameType': gameType,
          },
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Select a Game')),
      body: Center(
        child: _isFindingGame
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 20),
                  Text(_statusMessage, textAlign: TextAlign.center),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green[800]),
                    onPressed: () => _findGame('jungle'),
                    child: const Text('Jungle Professor'),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.lightBlue[800]),
                    onPressed: () => _findGame('city'),
                    child: const Text('City Tour'),
                  ),
                ],
              ),
      ),
    );
  }
}

class AnimalSelectionPage extends StatefulWidget {
  const AnimalSelectionPage({Key? key}) : super(key: key);

  @override
  _AnimalSelectionPageState createState() => _AnimalSelectionPageState();
}

class _AnimalSelectionPageState extends State<AnimalSelectionPage> {
  late WebSocketChannel channel;
  late Stream<String> stream;
  late String clientId;
  late String player;
  late String gameId;
  late String gameType;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    channel = args['channel'] as WebSocketChannel;
    stream = args['stream'] as Stream<String>;
    clientId = args['clientId'] as String;
    player = args['player'] as String;
    gameId = args['gameId'] as String;
    gameType = args['gameType'] as String;
  }

  void _selectAnimal(String animal) {
    final msg = jsonEncode({
      'method': 'animal_select',
      'clientId': clientId,
      'animal': animal,
      'gameId': gameId,
    });
    channel.sink.add(msg);

    // After selecting, go to the GamePage
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => GamePage(
          channel: channel,
          stream: stream,
          gameId: gameId,
          clientId: clientId,
          player: player,
          gameType: gameType,
          initialGameData: null, // let server send update with initial data
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const animals = ['lion', 'tiger', 'cheetah', 'elephant'];
    return Scaffold(
      appBar: AppBar(title: const Text('Choose Your Animal')),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        childAspectRatio: 1,
        children: animals.map((animal) {
          return Card(
            child: InkWell(
              onTap: () => _selectAnimal(animal),
              child: Center(
                // Placeholder: you should add asset images later
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // replace this with Image.asset('assets/animals/$animal.png')
                    Icon(Icons.pets, size: 50),
                    const SizedBox(height: 8),
                    Text(animal.toUpperCase(), style: const TextStyle(fontSize: 18)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class GamePage extends StatefulWidget {
  final WebSocketChannel channel;
  final Stream<String> stream;
  final String gameId;
  final String clientId;
  final String player;
  final String gameType;
  final Map<String, dynamic>? initialGameData;

  const GamePage({
    required this.channel,
    required this.stream,
    required this.gameId,
    required this.clientId,
    required this.player,
    required this.gameType,
    required this.initialGameData,
    Key? key,
  }) : super(key: key);

  @override
  _GamePageState createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> {
  late double minDimension;
  late Offset initialPosition;
  StreamSubscription? _gamePageListener;
  String gameStatus = 'playing';
  int currentPlayerIndex = 0;
  Map<String, int> playerSteps = {};
  int totalPlayers = 0;
  String _lastEventText = "Game has started!";
  bool _isPopupVisible = false;
  List<Map<String, dynamic>> _currentResults = [];
  Map<String, String> playerAnimal = {};

  @override
  void initState() {
    super.initState();
    if (widget.initialGameData != null) {
      _updateStateFromServer(widget.initialGameData!);
    }
    _gamePageListener = widget.stream.listen((message) {
      if (!mounted) return;
      final data = jsonDecode(message);
      final method = data['method'];
      if (method == 'update') {
        _updateStateFromServer(data);
      } else if (method == 'ask_question') {
        if (_isPopupVisible) Navigator.of(context, rootNavigator: true).pop();
        _showQuestionPopup(data);
      } else if (method == 'game_over') {
        Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (context) => ResultsPage(
            results: List<Map<String, dynamic>>.from(data['results']),
            gameType: data['gameType'] ?? widget.gameType,
          ),
        ));
      }
    }, onDone: () {
      if (mounted && !_isPopupVisible) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (context) => ResultsPage(results: _currentResults, gameType: widget.gameType),
        ));
      }
    });
  }

  @override
  void dispose() {
    _gamePageListener?.cancel();
    widget.channel.sink.close();
    super.dispose();
  }

  void _updateStateFromServer(Map<String, dynamic> data) {
    final game = data['game'];
    final gameState = game['state'];
    final clients = game['clients'] as List;

    if (mounted) {
      setState(() {
        gameStatus = gameState['status'];
        totalPlayers = clients.length;
        currentPlayerIndex = gameState['currentPlayerIndex'];
        _lastEventText = gameState['lastEvent'] ?? "Your turn!";

        if (gameState['answeredQuestions'] != null) {
          _currentResults = List<Map<String, dynamic>>.from(gameState['answeredQuestions']);
        }

        // store steps
        for (var i = 0; i < totalPlayers; i++) {
          String playerKey = 'p${i + 1}';
          if (gameState.containsKey(playerKey)) {
            playerSteps[playerKey] = gameState[playerKey]['steps'];
          }
        }

        // store animal selection per player
        if (gameState.containsKey('animals')) {
          final Map<String, dynamic> animalsMap = gameState['animals'];
          for (var entry in animalsMap.entries) {
            playerAnimal[entry.key] = entry.value as String;
          }
        }
      });
    }
  }

  void _sendPlayRequest() {
    widget.channel.sink.add(jsonEncode({
      'method': 'play',
      'clientId': widget.clientId,
      'gameId': widget.gameId,
    }));
  }

  void _sendAnswer(String answer) {
    widget.channel.sink.add(jsonEncode({
      'method': 'submit_answer',
      'clientId': widget.clientId,
      'gameId': widget.gameId,
      'answer': answer,
    }));
  }

  Offset calculatePlayerPosition(int steps) {
    double xPos = 0.0, yPos = 0.0;
    if (minDimension > 0) {
      xPos = initialPosition.dx;
      yPos = initialPosition.dy;
    }
    int effectiveSteps = steps > 0 ? (steps % 34 == 0 ? 33 : steps % 34) : 0;
    // (your existing logic for step -> coordinate mapping)
    // ... (keep your existing mapping here)
    // for brevity, not rewriting all cases — but you should preserve them
    return Offset(xPos, yPos);
  }

  @override
  Widget build(BuildContext context) {
    final Color themeColor = widget.gameType == 'jungle' ? Colors.green : Colors.lightBlue;
    final String boardImage = widget.gameType == 'jungle'
        ? 'images/IMG-20240301-WA0006.jpg'
        : 'images/IMG-20240305-WA0002.jpg';
    final String currentPlayerTurn = 'p${currentPlayerIndex + 1}';
    final bool isMyTurn = (widget.player == currentPlayerTurn);
    final bool canIRoll = isMyTurn && gameStatus == 'playing';

    String buttonText = "Waiting for ${currentPlayerTurn.toUpperCase()}...";
    if (gameStatus != 'playing') {
      buttonText = "Waiting for answer...";
    } else if (canIRoll) {
      buttonText = "Roll Dice";
    }

    return WillPopScope(
      onWillPop: () async {
        final shouldLeave = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Leave Game?'),
            content: const Text('Are you sure you want to leave? This will end the game for all players.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Stay')),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Leave')),
            ],
          ),
        );

        if (shouldLeave ?? false) {
          Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (context) => ResultsPage(results: _currentResults, gameType: widget.gameType),
          ));
          return false;
        }

        return false;
      },
      child: Scaffold(
        appBar: AppBar(title: Text("Game - You are ${widget.player.toUpperCase()}"), backgroundColor: themeColor),
        body: Column(
          children: [
            Expanded(
              child: LayoutBuilder(builder: (context, constraints) {
                minDimension = constraints.maxWidth < constraints.maxHeight ? constraints.maxWidth : constraints.maxHeight;
                initialPosition = Offset(minDimension * 0.055, minDimension * 0.85);

                List<Widget> playerWidgets = [];
                for (var i = 0; i < totalPlayers; i++) {
                  String playerKey = 'p${i + 1}';
                  int steps = playerSteps[playerKey] ?? 0;
                  Offset position = calculatePlayerPosition(steps);
                  String animal = playerAnimal[playerKey] ?? 'default';
                  Widget piece;
                  // Replace this switch with Image.asset when you have your animal pngs
                  switch (animal) {
                    case 'lion':
                      piece = const Icon(Icons.pets, color: Colors.orange, size: 40);
                      break;
                    case 'tiger':
                      piece = const Icon(Icons.pets, color: Colors.deepOrange, size: 40);
                      break;
                    case 'cheetah':
                      piece = const Icon(Icons.pets, color: Colors.yellow, size: 40);
                      break;
                    case 'elephant':
                      piece = const Icon(Icons.pets, color: Colors.grey, size: 40);
                      break;
                    default:
                      piece = Container(
                        width: minDimension * 0.1,
                        height: minDimension * 0.1,
                        decoration: BoxDecoration(
                          color: Colors.grey,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.black, width: 2),
                        ),
                      );
                  }

                  playerWidgets.add(AnimatedPositioned(
                    left: position.dx,
                    top: position.dy,
                    duration: const Duration(milliseconds: 300),
                    child: piece,
                  ));
                }

                return Center(
                  child: SizedBox(
                    width: minDimension,
                    height: minDimension,
                    child: Stack(
                      children: [
                        Image.asset(boardImage, fit: BoxFit.cover),
                        ...playerWidgets,
                      ],
                    ),
                  ),
                );
              }),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Text(
                    _lastEventText,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: Colors.grey[800]),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 15),
                      textStyle: const TextStyle(fontSize: 20),
                    ),
                    onPressed: canIRoll ? _sendPlayRequest : null,
                    child: Text(buttonText),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ResultsPage extends StatelessWidget {
  final List<Map<String, dynamic>> results;
  final String gameType;

  const ResultsPage({Key? key, required this.results, required this.gameType}) : super(key: key);

  Future<void> _saveResults(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    if (username == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You must be logged in to save.')));
      return;
    }

    final Map<String, String> body = {
      'username': username,
      'results_data': jsonEncode(results),
      'game_type': gameType,
    };

    try {
      final response = await http.post(
        Uri.parse('$PHP_API_URL/save_results.php'),
        body: body,
      );
      if (context.mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Results saved!')));
          Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save failed: ${data['message']}')));
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error saving results.')));
      }
    }
  }

  void _shareResults() {
    String shareText = "Jungle Professor Game Results:\n\n";
    for (var result in results) {
      shareText += "Q: ${result['question']}\n";
      shareText += "A: ${result['correctAnswer']}\n\n";
    }
    Share.share(shareText);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Game Results'), automaticallyImplyLeading: false),
      body: Column(
        children: [
          Expanded(
            child: results.isEmpty
                ? const Center(child: Text('No questions were answered in this game.'))
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: results.length,
                    itemBuilder: (context, index) {
                      final result = results[index];
                      final bool wasCorrect = result['wasCorrect'];
                      return Card(
                        color: wasCorrect ? Colors.green[100] : Colors.red[100],
                        child: ListTile(
                          leading: Icon(wasCorrect ? Icons.check_circle : Icons.cancel,
                              color: wasCorrect ? Colors.green : Colors.red),
                          title: Text(result['question']),
                          subtitle: Text(
                              'Your answer: ${result['providedAnswer']}\nCorrect answer: ${result['correctAnswer']}'),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Wrap(
              spacing: 12.0,
              runSpacing: 12.0,
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () => _saveResults(context),
                  icon: const Icon(Icons.save),
                  label: const Text('Save'),
                ),
                ElevatedButton.icon(
                  onPressed: _shareResults,
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                ),
                ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false),
                  icon: const Icon(Icons.done),
                  label: const Text('Done'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.grey),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

class SavedResultsListPage extends StatefulWidget {
  const SavedResultsListPage({Key? key}) : super(key: key);
  @override
  _SavedResultsListPageState createState() => _SavedResultsListPageState();
}

class _SavedResultsListPageState extends State<SavedResultsListPage> {
  Future<List<dynamic>>? _savedResultsFuture;

  @override
  void initState() {
    super.initState();
    _savedResultsFuture = _fetchSavedResults();
  }

  Future<List<dynamic>> _fetchSavedResults() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    if (username == null) return [];

    try {
      final response = await http.get(Uri.parse('$PHP_API_URL/get_results.php?username=$username'));
      final data = jsonDecode(response.body);
      if (data['status'] == 'success') {
        return data['data'];
      }
    } catch (e) {
      // Handle error
    }
    return [];
  }

  void _viewResult(int resultId, String gameType) async {
    try {
      final response =
          await http.get(Uri.parse('$PHP_API_URL/get_single_result.php?id=$resultId'));
      if (context.mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          Navigator.of(context).push(MaterialPageRoute(
            builder: (context) => ResultsPage(
              results: List<Map<String, dynamic>>.from(data['data']),
              gameType: gameType,
            ),
          ));
        }
      }
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Saved Results')),
      body: FutureBuilder<List<dynamic>>(
        future: _savedResultsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('You have no saved results.'));
          }

          final resultsList = snapshot.data!;
          return ListView.builder(
            itemCount: resultsList.length,
            itemBuilder: (context, index) {
              final result = resultsList[index];
              final String gameTitle = (result['game_type'] == 'jungle'
                  ? 'Jungle Professor'
                  : 'City Tour');
              final String createdAt = result['created_at'] ?? 'Unknown date';
              return ListTile(
                leading: Icon(
                  result['game_type'] == 'jungle' ? Icons.park : Icons.location_city,
                ),
                title: Text(gameTitle),
                subtitle: Text('Played on $createdAt'),
                onTap: () =>
                    _viewResult(int.parse(result['id']), result['game_type']),
              );
            },
          );
        },
      ),
    );
  }
}
olympic@olympic-book:~/jungle_professor$ 

