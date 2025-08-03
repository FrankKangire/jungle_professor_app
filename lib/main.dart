import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';

// --- Configuration ---
const String SERVER_IP = "192.168.1.6"; // Your local IP
const String PHP_API_URL = "http://$SERVER_IP/jungle_professor/server/api";
const String WEBSOCKET_URL = "ws://$SERVER_IP:9090";

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
        primarySwatch: Colors.green,
        scaffoldBackgroundColor: Colors.green[50],
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.green[800],
          foregroundColor: Colors.white,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green[700],
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            textStyle: const TextStyle(fontSize: 16),
          ),
        ),
      ),
      initialRoute: initialRoute,
      routes: {
        '/': (context) => const HomePage(),
        '/login': (context) => const LoginPage(),
        '/signup': (context) => const SignupPage(),
        '/welcome': (context) => const WelcomePage(),
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
                case MenuAction.home: text = 'Home'; break;
                case MenuAction.login: text = 'Login'; break;
                case MenuAction.signup: text = 'Sign Up'; break;
                case MenuAction.logout: text = 'Logout'; break;
                case MenuAction.myResults: text = 'My Results'; break;
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
                'Welcome to Jungle Professor!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.green[900]),
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
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: Could not connect to server. Check IP address.')));
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
          Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['message'])));
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: Could not connect to server.')));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
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
          children: [
            TextField(controller: _usernameController, decoration: const InputDecoration(labelText: 'Username')),
            const SizedBox(height: 12),
            TextField(controller: _passwordController, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 20),
            _isLoading
                ? const CircularProgressIndicator()
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
  String _statusMessage = '';
  bool _isFindingGame = false;

  WebSocketChannel? _channel;
  StreamController<String>? _broadcastController;
  StreamSubscription? _streamListener;
  String? _clientId;
  bool _connectionHandedOff = false;

  @override
  void initState() {
    super.initState();
    _loadUsername();
  }

  @override
  void dispose() {
    if (!_connectionHandedOff) {
      _streamListener?.cancel();
      _broadcastController?.close();
      _channel?.sink.close();
    }
    super.dispose();
  }

  Future<void> _loadUsername() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _username = prefs.getString('username') ?? 'Player';
      });
    }
  }

  void _findGame() {
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
          setState(() { _isFindingGame = false; _statusMessage = 'Connection lost. Please try again.'; });
        }
        if (!(_broadcastController?.isClosed ?? true)) _broadcastController!.close();
      },
      onError: (error) {
        if (mounted && !_connectionHandedOff) {
          setState(() { _isFindingGame = false; _statusMessage = 'Connection error. Check server and IP.'; });
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
        setState(() => _statusMessage = 'Finding a game...');
        _channel!.sink.add(jsonEncode({'method': 'find_game', 'clientId': _clientId}));
      } else if (method == 'join') {
        setState(() => _statusMessage = 'Joined Game! Waiting for players...');
      } else if (method == 'start') {
        _streamListener?.cancel();
        _connectionHandedOff = true;
        
        if (mounted) {
          setState(() { _isFindingGame = false; _statusMessage = ''; });

          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => GamePage(
                channel: _channel!,
                stream: _broadcastController!.stream,
                gameId: data['game']['id'],
                clientId: _clientId!, 
                player: (data['game']['clients'] as List).firstWhere((c) => c['clientId'] == _clientId)['player'],
                initialGameData: data,
              ),
            ),
          );
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppMenu(title: 'Jungle Professor', actions: const [MenuAction.myResults, MenuAction.logout]),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Welcome, $_username!', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 40),
              if (_isFindingGame) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 20),
                Text(_statusMessage, textAlign: TextAlign.center),
              ] else ...[
                ElevatedButton(
                  onPressed: _findGame,
                  child: const Text('Find Game'),
                ),
              ]
            ],
          ),
        ),
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
  final Map<String, dynamic> initialGameData;

  const GamePage({
    required this.channel, required this.stream, required this.gameId, required this.clientId, required this.player, required this.initialGameData, Key? key,
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

  final List<Color> playerColors = [Colors.blue, Colors.yellow, Colors.red, Colors.green];

  @override
  void initState() {
    super.initState();
    _updateStateFromServer(widget.initialGameData);
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
          ),
        ));
      }
    },
    onDone: () {
      if(mounted) {
        if (!_isPopupVisible) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Game Over: A player disconnected.')));
          Navigator.of(context).pop();
        }
      }
    });
  }
  
  void _showQuestionPopup(Map<String, dynamic> data) {
    setState(() => _isPopupVisible = true);
    final String question = data['question'];
    final String playerAnswering = data['playerAnswering'];
    final int qNum = data['questionNumber'];
    final int qTotal = data['totalQuestions'];
    final answerController = TextEditingController();
    final bool amIAnswering = widget.player == playerAnswering;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text("Question $qNum of $qTotal for ${playerAnswering.toUpperCase()}"),
          content: SingleChildScrollView(
            child: ListBody(children: <Widget>[
              Text(question, style: const TextStyle(fontSize: 18)),
              const SizedBox(height: 20),
              if(amIAnswering)
                TextField(
                  controller: answerController,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Your Answer', border: OutlineInputBorder()),
                )
              else
                const Text("Waiting for their answer...")
            ]),
          ),
          actions: <Widget>[
            if(amIAnswering)
              TextButton(
                child: const Text('Submit', style: TextStyle(fontSize: 16)),
                onPressed: () {
                  _sendAnswer(answerController.text);
                  Navigator.of(context).pop();
                },
              ),
          ],
        );
      },
    ).then((_) {
      if(mounted) setState(() => _isPopupVisible = false);
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
        for (var i = 0; i < totalPlayers; i++) {
          String playerKey = 'p${i + 1}';
          if (gameState.containsKey(playerKey)) {
            playerSteps[playerKey] = gameState[playerKey]['steps'];
          }
        }
      });
    }
  }

  void _sendPlayRequest() {
    widget.channel.sink.add(jsonEncode({'method': 'play', 'clientId': widget.clientId, 'gameId': widget.gameId}));
  }

  void _sendAnswer(String answer) {
    widget.channel.sink.add(jsonEncode({'method': 'submit_answer', 'clientId': widget.clientId, 'gameId': widget.gameId, 'answer': answer}));
  }

  Offset calculatePlayerPosition(int steps) {
    double xPos = 0.0, yPos = 0.0;
    if (this.mounted && (initialPosition != null)) {
      xPos = initialPosition.dx;
      yPos = initialPosition.dy;
    }
    
    int effectiveSteps = steps > 0 ? (steps % 34 == 0 ? 33 : steps % 34) : 0;
    if (effectiveSteps == 0) { return Offset(xPos, yPos); }
    if (effectiveSteps == 1) { xPos = minDimension * 0.218; }
    if (effectiveSteps == 2) { xPos = minDimension * 0.332; }
    if (effectiveSteps == 3) { xPos = minDimension * 0.452; }
    if (effectiveSteps == 4) { xPos = minDimension * 0.564; }
    if (effectiveSteps == 5) { xPos = minDimension * 0.678; }
    if (effectiveSteps == 6) { xPos = minDimension * 0.845; }
    if (effectiveSteps == 7) { xPos = minDimension * 0.845; yPos = minDimension * 0.688; }
    if (effectiveSteps == 8) { xPos = minDimension * 0.845; yPos = minDimension * 0.574; }
    if (effectiveSteps == 9) { xPos = minDimension * 0.845; yPos = minDimension * 0.460; }
    if (effectiveSteps == 10) { xPos = minDimension * 0.845; yPos = minDimension * 0.346; }
    if (effectiveSteps == 11) { xPos = minDimension * 0.845; yPos = minDimension * 0.232; }
    if (effectiveSteps == 12) { xPos = minDimension * 0.845; yPos = minDimension * 0.065; }
    if (effectiveSteps == 13) { xPos = minDimension * 0.678; yPos = minDimension * 0.065; }
    if (effectiveSteps == 14) { xPos = minDimension * 0.564; yPos = minDimension * 0.065; }
    if (effectiveSteps == 15) { xPos = minDimension * 0.452; yPos = minDimension * 0.065; }
    if (effectiveSteps == 16) { xPos = minDimension * 0.332; yPos = minDimension * 0.065; }
    if (effectiveSteps == 17) { xPos = minDimension * 0.218; yPos = minDimension * 0.065; }
    if (effectiveSteps == 18) { xPos = minDimension * 0.055; yPos = minDimension * 0.065; }
    if (effectiveSteps == 19) { xPos = minDimension * 0.055; yPos = minDimension * 0.232; }
    if (effectiveSteps == 20) { xPos = minDimension * 0.055; yPos = minDimension * 0.346; }
    if (effectiveSteps == 21) { xPos = minDimension * 0.055; yPos = minDimension * 0.460; }
    if (effectiveSteps == 22) { xPos = minDimension * 0.055; yPos = minDimension * 0.574; }
    if (effectiveSteps == 23) { xPos = minDimension * 0.055; yPos = minDimension * 0.688; }
    if (effectiveSteps == 24) { xPos = minDimension * 0.213; yPos = minDimension * 0.688; }
    if (effectiveSteps == 25) { xPos = minDimension * 0.345; yPos = minDimension * 0.705; }
    if (effectiveSteps == 26) { xPos = minDimension * 0.448; yPos = minDimension * 0.695; }
    if (effectiveSteps == 27) { xPos = minDimension * 0.551; yPos = minDimension * 0.705; }
    if (effectiveSteps == 28) { xPos = minDimension * 0.685; yPos = minDimension * 0.352; }
    if (effectiveSteps == 29) { xPos = minDimension * 0.673; yPos = minDimension * 0.215; }
    if (effectiveSteps == 30) { xPos = minDimension * 0.555; yPos = minDimension * 0.215; }
    if (effectiveSteps == 31) { xPos = minDimension * 0.452; yPos = minDimension * 0.215; }
    if (effectiveSteps == 32) { xPos = minDimension * 0.335; yPos = minDimension * 0.215; }
    if (effectiveSteps == 33) { xPos = minDimension * 0.207; yPos = minDimension * 0.561; }
    return Offset(xPos, yPos);
  }

  @override
  Widget build(BuildContext context) {
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
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Leave Game?'),
            content: const Text('Are you sure you want to leave the current game? This will end the game for all players.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Leave')),
            ],
          ),
        );
        return shouldPop ?? false;
      },
      child: Scaffold(
        appBar: AppBar(title: Text("Game - You are ${widget.player.toUpperCase()}"), automaticallyImplyLeading: false),
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
                  playerWidgets.add(AnimatedPositioned(
                    left: position.dx, top: position.dy, duration: const Duration(milliseconds: 300),
                    child: Container(
                      height: minDimension * 0.1, width: minDimension * 0.1,
                      decoration: BoxDecoration(
                        color: playerColors[i % playerColors.length],
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.black, width: 2),
                      ),
                    ),
                  ));
                }

                return Center(
                  child: SizedBox(
                    width: minDimension,
                    height: minDimension,
                    child: Stack(
                      children: [
                        Image.asset('images/IMG-20240301-WA0006.jpg', fit: BoxFit.cover),
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
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: Colors.green[900]),
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

// --- NEW WIDGET: ResultsPage ---
class ResultsPage extends StatelessWidget {
  final List<Map<String, dynamic>> results;

  const ResultsPage({Key? key, required this.results}) : super(key: key);

  Future<void> _saveResults(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    if (username == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You must be logged in to save.')));
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('$PHP_API_URL/save_results.php'),
        body: {
          'username': username,
          'results_data': jsonEncode(results),
        },
      );
      if (context.mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Results saved!')));
          Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['message'])));
        }
      }
    } catch(e) {
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
                          leading: Icon(wasCorrect ? Icons.check_circle : Icons.cancel, color: wasCorrect ? Colors.green : Colors.red),
                          title: Text(result['question']),
                          subtitle: Text('Your answer: ${result['providedAnswer']}\nCorrect answer: ${result['correctAnswer']}'),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
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
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/welcome', (route) => false),
                  child: const Text('Done'),
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

// --- NEW WIDGET: SavedResultsListPage ---
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
    } catch(e) {
      // Handle error
    }
    return [];
  }
  
  void _viewResult(int resultId) async {
    try {
      final response = await http.get(Uri.parse('$PHP_API_URL/get_single_result.php?id=$resultId'));
      if (context.mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
           Navigator.of(context).push(MaterialPageRoute(
              builder: (context) => ResultsPage(results: List<Map<String, dynamic>>.from(data['data'])),
           ));
        }
      }
    } catch(e) {
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
              return ListTile(
                leading: const Icon(Icons.history),
                title: Text('Game from ${result['created_at']}'),
                onTap: () => _viewResult(result['id']),
              );
            },
          );
        },
      ),
    );
  }
}