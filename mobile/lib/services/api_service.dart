import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use local server IP. On Android emulator, 10.0.2.2 points to host's localhost (127.0.0.1)
  static const String baseUrl = 'https://pdd-mkge.onrender.com/api';
  
  static String _token = '';

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token') ?? '';
  }

  static String get token => _token;

  static bool get isAuthenticated => _token.isNotEmpty;

  static Future<Map<String, String>> _headers() async {
    return {
      'Content-Type': 'application/json',
      if (_token.isNotEmpty) 'Authorization': 'Bearer $_token',
    };
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: await _headers(),
        body: jsonEncode({'email': email, 'password': password}),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        _token = data['data']['token'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token);
        return {'success': true, 'user': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Login failed'};
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  static Future<Map<String, dynamic>> register(
    String name,
    String email,
    String phone,
    String password,
    String mpin,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: await _headers(),
        body: jsonEncode({
          'name': name,
          'email': email,
          'phone': phone,
          'password': password,
          'mpin': mpin,
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        _token = data['data']['token'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token);
        return {'success': true, 'user': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Registration failed'};
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  static Future<void> logout() async {
    _token = '';
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  // Get active journey
  static Future<Map<String, dynamic>?> getActiveJourney() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/journey/active'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data'];
      }
    } catch (e) {
      print('Error getting active journey: $e');
    }
    return null;
  }

  // Start journey
  static Future<Map<String, dynamic>> startJourney({
    required String destinationName,
    required double destinationLatitude,
    required double destinationLongitude,
    required double destinationRadius,
    required String travelMode,
    required String vehicleNumber,
    required DateTime expectedReachTime,
    required double currentLatitude,
    required double currentLongitude,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/journey/start'),
        headers: await _headers(),
        body: jsonEncode({
          'destinationName': destinationName,
          'destinationLatitude': destinationLatitude,
          'destinationLongitude': destinationLongitude,
          'destinationRadius': destinationRadius,
          'travelMode': travelMode,
          'vehicleNumber': vehicleNumber,
          'expectedReachTime': expectedReachTime.toIso8601String(),
          'currentLatitude': currentLatitude,
          'currentLongitude': currentLongitude,
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed to start journey'};
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  // Update journey location breadcrumbs
  static Future<void> updateJourneyLocation(double latitude, double longitude) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/journey/update-location'),
        headers: await _headers(),
        body: jsonEncode({
          'latitude': latitude,
          'longitude': longitude,
        }),
      );
    } catch (e) {
      print('Error updating journey location: $e');
    }
  }

  // Check in using MPIN
  static Future<Map<String, dynamic>> checkIn(String mpin, String action) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/journey/check-in'),
        headers: await _headers(),
        body: jsonEncode({
          'mpin': mpin,
          'action': action, // 'extend' or 'complete'
        }),
      );
      final data = jsonDecode(response.body);
      return {
        'success': data['success'] == true,
        'message': data['message'] ?? 'Verification failed',
      };
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  // Complete journey manually
  static Future<void> completeJourney() async {
    try {
      await http.post(
        Uri.parse('$baseUrl/journey/complete'),
        headers: await _headers(),
      );
    } catch (e) {
      print('Error ending journey: $e');
    }
  }

  // Trigger SOS Alert
  static Future<Map<String, dynamic>> triggerSOS(double latitude, double longitude, {String triggerType = 'manual_sos'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/alerts/trigger'),
        headers: await _headers(),
        body: jsonEncode({
          'latitude': latitude,
          'longitude': longitude,
          'triggerType': triggerType,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'contacts': data['contacts'] ?? []};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed to trigger SOS'};
    } catch (e) {
      return {'success': false, 'message': 'Network error: $e'};
    }
  }

  // Resolve active SOS alert
  static Future<void> resolveSOS() async {
    try {
      await http.post(
        Uri.parse('$baseUrl/alerts/resolve'),
        headers: await _headers(),
      );
    } catch (e) {
      print('Error resolving SOS: $e');
    }
  }

  // Fetch static safe places
  static Future<List<dynamic>> getSafePlaces() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/safeplaces'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        return data['data'] ?? [];
      }
    } catch (e) {
      print('Error loading safe places: $e');
    }
    return [];
  }

  // Add static safe place
  static Future<bool> addSafePlace(String name, double lat, double lng, double radius) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/safeplaces'),
        headers: await _headers(),
        body: jsonEncode({
          'name': name,
          'latitude': lat,
          'longitude': lng,
          'radius': radius,
        }),
      );
      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      print('Error adding safe place: $e');
      return false;
    }
  }

  // Delete static safe place
  static Future<bool> deleteSafePlace(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/safeplaces/$id'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      print('Error removing safe place: $e');
      return false;
    }
  }

  // Get Emergency Contacts
  static Future<List<dynamic>> getContacts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/contacts'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        return data['data'] ?? [];
      }
    } catch (e) {
      print('Error getting contacts: $e');
    }
    return [];
  }

  // Add Emergency Contact
  static Future<bool> addContact(String name, String phone, String email, String relationship) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/contacts'),
        headers: await _headers(),
        body: jsonEncode({
          'name': name,
          'phone': phone,
          'email': email,
          'relationship': relationship,
        }),
      );
      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      print('Error adding contact: $e');
      return false;
    }
  }

  // Delete Emergency Contact
  static Future<bool> deleteContact(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/contacts/$id'),
        headers: await _headers(),
      );
      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      print('Error removing contact: $e');
      return false;
    }
  }
}
