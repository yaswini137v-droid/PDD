import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../services/location_service.dart';
import 'login_screen.dart';
import 'journey_screen.dart';
import 'contacts_screen.dart';
import 'geofence_screen.dart';
import 'mpin_checkin_screen.dart';
import 'responder_map_screen.dart';
import 'package:geolocator/geolocator.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  // SOS trigger state variables
  bool _sosActive = false;
  bool _countingDown = false;
  int _countdownSeconds = 3;
  Timer? _countdownTimer;
  
  Map<String, dynamic>? _activeJourney;
  bool _loading = true;
  String _userName = 'Traveler';
  String _userId = '';
  
  // Coordinates telemetry display
  double _currLat = 0.0;
  double _currLng = 0.0;
  double _distanceToDest = 0.0;

  AnimationController? _rippleController;
  Timer? _locationUpdateTimer;
  List<Map<String, dynamic>> _incomingResponders = [];

  @override
  void dispose() {
    _locationUpdateTimer?.cancel();
    _countdownTimer?.cancel();
    _rippleController?.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _rippleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    await ApiService.init();
    
    // Fetch profile info from local storage or server
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userName = prefs.getString('userName') ?? 'Traveler';
    });

    // Check active status on server
    await _syncActiveData();

    // Initialize Native MethodChannel hooks
    await LocationServiceWrapper.init();
    
    LocationServiceWrapper.onLocationUpdate = (lat, lng, dist) {
      setState(() {
        _currLat = lat;
        _currLng = lng;
        _distanceToDest = dist;
      });
      // Push location changes to server
      ApiService.updateJourneyLocation(lat, lng);
    };

    LocationServiceWrapper.onGeofenceBreach = (lat, lng) {
      print('Native Geofence exit alert! Auto SOS trigger sequence active...');
      _dispatchSOS(triggerType: 'geofence_breach');
    };

    // Socket.io telemetry bindings
    if (_userId.isNotEmpty) {
      SocketService.connect(_userId);
      
      SocketService.onCheckInPrompt = (data) {
        print('Check-in prompt WebSocket received: $data');
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => MpinCheckinScreen(journeyId: data['journeyId'] ?? ''),
            ),
          );
        }
      };

      SocketService.onCheckInAlert = (data) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Grace period active! Check-in required.'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 5),
          ),
        );
      };

      SocketService.onEmergencyEscalated = (data) {
        setState(() {
          _sosActive = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Safety timeout expired. Emergency escalated!'),
            backgroundColor: Colors.red,
          ),
        );
      };

      SocketService.onNearbySosAlert = (data) {
        print('Nearby SOS alert WebSocket received: $data');
        if (mounted) {
          // Show overlay dialog
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              backgroundColor: const Color(0xFF0F172A),
              title: const Row(
                children: [
                  Icon(Icons.warning, color: Colors.red),
                  SizedBox(width: 8),
                  Text('🚨 NEIGHBOR SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
              content: Text(
                '${data['user']?['name'] ?? 'Someone'} needs help nearby! (within 1 km)',
                style: const TextStyle(color: Colors.white),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('DISMISS', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ResponderMapScreen(
                          alertId: data['alertId'] ?? '',
                          dangerUserName: data['user']?['name'] ?? 'Someone',
                          dangerUserPhone: data['user']?['phone'] ?? '',
                          latitude: double.tryParse(data['latitude']?.toString() ?? '') ?? 0.0,
                          longitude: double.tryParse(data['longitude']?.toString() ?? '') ?? 0.0,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  child: const Text('SHOW MAP', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        }
      };

      SocketService.onResponderUpdated = (data) {
        print('Responder update WebSocket received: $data');
        final resp = data['responder'];
        if (resp != null) {
          setState(() {
            if (!_incomingResponders.any((r) => r['id'] == resp['id'])) {
              _incomingResponders.add({
                'id': resp['id'],
                'name': resp['name'],
                'phone': resp['phone'],
              });
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🛡️ Neighbor ${resp['name']} is responding to your SOS!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      };
    }

    // Request permissions and start periodic user active location updates
    _startPeriodicLocationUpdates();
  }

  Future<void> _startPeriodicLocationUpdates() async {
    // Run once immediately
    _reportLocation();
    
    // Then run every 40 seconds
    _locationUpdateTimer = Timer.periodic(const Duration(seconds: 40), (timer) {
      _reportLocation();
    });
  }

  Future<void> _reportLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
        setState(() {
          _currLat = pos.latitude;
          _currLng = pos.longitude;
        });
        await ApiService.updateUserLocation(pos.latitude, pos.longitude);
      }
    } catch (e) {
      print('Error reporting periodic location: $e');
    }
  }

  Future<void> _syncActiveData() async {
    setState(() {
      _loading = true;
    });

    // Load user details
    try {
      final profile = await ApiService.getUserProfile();
      if (profile != null) {
        _userId = profile['_id'] ?? '';
        _userName = profile['name'] ?? 'Traveler';
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userName', _userName);
      }
    } catch (e) {
      print('Error loading user profile: $e');
    }

    final activeJ = await ApiService.getActiveJourney();

    setState(() {
      _activeJourney = activeJ;
      if (activeJ != null) {
        _sosActive = activeJ['status'] == 'sos_triggered';
        _currLat = activeJ['currentLatitude'] ?? 0.0;
        _currLng = activeJ['currentLongitude'] ?? 0.0;
        
        // Populate responders if journey is already in SOS mode
        if (_sosActive && activeJ['alert'] != null && activeJ['alert']['responders'] != null) {
          final List<dynamic> resps = activeJ['alert']['responders'];
          _incomingResponders = resps.map((r) => {
            'id': r['user']['_id'] ?? '',
            'name': r['user']['name'] ?? '',
            'phone': r['user']['phone'] ?? '',
          }).toList();
        }
      }
      _loading = false;
    });
  }

  // SOS button click countdown
  void _toggleSOSButton() {
    if (_sosActive) {
      _resolveSOSAlert();
    } else {
      if (_countingDown) {
        _cancelCountdown();
      } else {
        _startSOSCountdown();
      }
    }
  }

  void _startSOSCountdown() {
    setState(() {
      _countingDown = true;
      _countdownSeconds = 3;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdownSeconds > 1) {
        setState(() {
          _countdownSeconds--;
        });
      } else {
        _countdownTimer?.cancel();
        setState(() {
          _countingDown = false;
        });
        _dispatchSOS();
      }
    });
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    setState(() {
      _countingDown = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('SOS Dispatch Canceled'), backgroundColor: Colors.blueGrey),
    );
  }

  Future<void> _dispatchSOS({String triggerType = 'manual_sos'}) async {
    setState(() {
      _sosActive = true;
    });
    try {
      await ApiService.triggerSOS(_currLat, _currLng, triggerType: triggerType);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🚨 SOS Alert Dispatched to Guardians!'), backgroundColor: Colors.red),
      );
    } catch (e) {
      print('SOS error: $e');
    }
  }

  Future<void> _resolveSOSAlert() async {
    setState(() {
      _sosActive = false;
    });
    try {
      await ApiService.resolveSOS();
      await LocationServiceWrapper.stopTracking();
      await _syncActiveData();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SOS Alarm Resolved. All Safe.'), backgroundColor: Colors.green),
      );
    } catch (e) {
      print('Resolve error: $e');
    }
  }

  Future<void> _endJourney() async {
    try {
      await ApiService.completeJourney();
      await LocationServiceWrapper.stopTracking();
      await _syncActiveData();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Journey Completed safely!'), backgroundColor: Colors.green),
      );
    } catch (e) {
      print('End journey error: $e');
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.logout();
    SocketService.disconnect();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }



  @override
  Widget build(BuildContext context) {
    const bgColor = Color(0xFF080B11);
    const cardColor = Color(0xFF0F172A);
    const dangerColor = Color(0xFFEF4444);
    const successColor = Color(0xFF10B981);
    const accentColor = Color(0xFF3B82F6);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('TravelSafetySOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: cardColor,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _syncActiveData,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.grey),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: accentColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Welcome header
                  Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: Color(0x203B82F6),
                        child: Icon(Icons.person, color: accentColor),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('SAFETY SCAN STATUS', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                          Text(
                            _sosActive ? '🚨 EMERGENCY ALARM ACTIVE' : '🛡️ YOU ARE PROTECTED',
                            style: TextStyle(
                              color: _sosActive ? dangerColor : successColor,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Giant SOS Ripple Button Layout
                  Center(
                    child: AnimatedBuilder(
                      animation: _rippleController!,
                      builder: (context, child) {
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            // Ripples when active or counting down
                            if (_sosActive || _countingDown) ...[
                              Container(
                                width: 220 + (_rippleController!.value * 40),
                                height: 220 + (_rippleController!.value * 40),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: (_sosActive ? dangerColor : accentColor).withOpacity(0.12 * (1 - _rippleController!.value)),
                                ),
                              ),
                              Container(
                                width: 180 + (_rippleController!.value * 30),
                                height: 180 + (_rippleController!.value * 30),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: (_sosActive ? dangerColor : accentColor).withOpacity(0.18 * (1 - _rippleController!.value)),
                                ),
                              ),
                            ],
                            
                            // Core Button Gesture Wrapper
                            GestureDetector(
                              onTap: _toggleSOSButton,
                              child: Container(
                                width: 170,
                                height: 170,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _sosActive ? dangerColor : (_countingDown ? accentColor : dangerColor.withOpacity(0.85)),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (_sosActive ? dangerColor : (_countingDown ? accentColor : dangerColor)).withOpacity(0.35),
                                      blurRadius: 16,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                                alignment: Alignment.center,
                                child: _countingDown
                                    ? Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            '$_countdownSeconds',
                                            style: const TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.bold),
                                          ),
                                          const Text('TAP CANCEL', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ],
                                      )
                                    : Text(
                                        _sosActive ? 'RESOLVE' : 'SOS',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 34,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 1.5,
                                        ),
                                      ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Tap SOS to trigger emergency response or hold cancel if accidental.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                  const SizedBox(height: 32),
                  
                  if (_sosActive) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.security, color: successColor, size: 20),
                              SizedBox(width: 8),
                              Text('Rescue Coordination', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const Divider(color: Colors.white10, height: 24),
                          if (_incomingResponders.isEmpty)
                            const Text(
                              'Waiting for nearby neighbors to respond...',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey, fontSize: 13, fontStyle: FontStyle.italic),
                            )
                          else ...[
                            Text(
                              '${_incomingResponders.length} incoming responder(s):',
                              style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 10),
                            ..._incomingResponders.map((responder) {
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: bgColor,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.person, color: successColor, size: 18),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            responder['name'] ?? 'Neighbor',
                                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Phone: ${responder['phone'] ?? ''}',
                                            style: const TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'monospace'),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Text(
                                      'EN ROUTE',
                                      style: TextStyle(color: successColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],

                  // Active Journey Card
                  if (_activeJourney != null) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.06)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.directions_run, color: accentColor, size: 20),
                              SizedBox(width: 8),
                              Text('Active Travel Journey', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const Divider(color: Colors.white10, height: 24),
                          
                          Text(
                            'Destination: ${_activeJourney!['destinationName']}',
                            style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Text('Travel: ${_activeJourney!['travelMode']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              if (_activeJourney!['vehicleNumber'] != null) ...[
                                const SizedBox(width: 12),
                                Text('Vehicle: ${_activeJourney!['vehicleNumber']}', style: const TextStyle(color: Colors.grey, fontSize: 12, fontFamily: 'monospace')),
                              ]
                            ],
                          ),
                          const SizedBox(height: 16),
                          
                          // Telemetry stats row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Telemetry: (${_currLat.toStringAsFixed(4)}, ${_currLng.toStringAsFixed(4)})',
                                style: const TextStyle(color: Colors.grey, fontSize: 11, fontFamily: 'monospace'),
                              ),
                              Text(
                                'Dist: ${_distanceToDest.toInt()}m',
                                style: const TextStyle(color: Colors.pinkAccent, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () => _dispatchSOS(triggerType: 'manual_sos'),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: dangerColor),
                                  ),
                                  child: const Text('Force SOS Alert', style: TextStyle(color: dangerColor)),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: _endJourney,
                                  style: ElevatedButton.styleFrom(backgroundColor: successColor),
                                  child: const Text('End Travel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Options Menu List
                  const Text('CRITICAL FEATURES', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  const SizedBox(height: 8),
                  
                  // Feature Tiles
                  Card(
                    color: cardColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: const Icon(Icons.explore, color: accentColor),
                      title: const Text('Plan / Start Journey', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Search destinations and map geofences', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      onTap: () {
                        if (_activeJourney != null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('You are already traveling. Complete current trip first.')),
                          );
                          return;
                        }
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const JourneyScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),

                  Card(
                    color: cardColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: const Icon(Icons.home, color: successColor),
                      title: const Text('Configure Safe Places', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Define permanent geofence zones', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const GeofenceScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),

                  Card(
                    color: cardColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: const Icon(Icons.people, color: Colors.orangeAccent),
                      title: const Text('Emergency Guardians', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Register guardian contact directories', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ContactsScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
// wait! _toggleSOSButton calls resolve if active, or starts countdown if not active. This is extremely robust.
