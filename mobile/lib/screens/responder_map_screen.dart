import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/api_service.dart';

class ResponderMapScreen extends StatefulWidget {
  final String alertId;
  final String dangerUserName;
  final String dangerUserPhone;
  final double latitude;
  final double longitude;

  const ResponderMapScreen({
    super.key,
    required this.alertId,
    required this.dangerUserName,
    required this.dangerUserPhone,
    required this.latitude,
    required this.longitude,
  });

  @override
  State<ResponderMapScreen> createState() => _ResponderMapScreenState();
}

class _ResponderMapScreenState extends State<ResponderMapScreen> {
  final MapController _mapController = MapController();
  bool _responding = false;
  bool _submitting = false;

  Future<void> _markResponding() async {
    setState(() {
      _submitting = true;
    });

    try {
      final res = await ApiService.respondToSOS(widget.alertId);
      if (res['success'] == true) {
        setState(() {
          _responding = true;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Status updated! You are marked as responding.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed: ${res['message']}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const bgColor = Color(0xFF080B11);
    const cardColor = Color(0xFF0F172A);
    const dangerColor = Color(0xFFEF4444);
    const successColor = Color(0xFF10B981);
    final targetLatLng = LatLng(widget.latitude, widget.longitude);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('🚨 Emergency Response Map', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: cardColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Header Card with info
          Container(
            color: cardColor,
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: dangerColor, size: 28),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${widget.dangerUserName} needs help!',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Phone: ${widget.dangerUserPhone}',
                            style: const TextStyle(color: Colors.grey, fontSize: 13, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: (_responding || _submitting) ? null : _markResponding,
                  icon: _submitting 
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(Icons.directions_run, color: Colors.white),
                  label: Text(
                    _responding ? 'YOU ARE RESPONDING' : 'I AM RESPONDING',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _responding ? successColor : dangerColor,
                    disabledBackgroundColor: _responding ? successColor.withOpacity(0.5) : cardColor.withOpacity(0.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
          ),
          
          // Map View
          Expanded(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: targetLatLng,
                initialZoom: 15.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.travelsafetysos.mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: targetLatLng,
                      width: 50,
                      height: 50,
                      child: const Stack(
                        alignment: Alignment.center,
                        children: [
                          Icon(Icons.location_on, color: dangerColor, size: 45),
                          Positioned(
                            top: 8,
                            child: Icon(Icons.person, color: Colors.white, size: 18),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
