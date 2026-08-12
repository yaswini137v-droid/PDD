import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/push_notification_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLogin = true;
  final _formKey = GlobalKey<FormState>();
  
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _mpinController = TextEditingController();

  bool _loading = false;
  String _errorMsg = '';

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _loading = true;
      _errorMsg = '';
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text.trim();

      Map<String, dynamic> result;
      if (_isLogin) {
        result = await ApiService.login(email, password);
      } else {
        final name = _nameController.text.trim();
        final phone = _phoneController.text.trim();
        final mpin = _mpinController.text.trim();
        
        result = await ApiService.register(name, email, phone, password, mpin);
      }

      if (mounted) {
        if (result['success'] == true) {
          // Upload FCM token to backend
          PushNotificationService.uploadToken();

          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const HomeScreen()),
          );
        } else {
          setState(() {
            _errorMsg = result['message'] ?? 'An error occurred';
          });
        }
      }
    } catch (e) {
      setState(() {
        _errorMsg = 'Connection failed: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Premium dark design system color scheme
    const bgColor = Color(0xFF080B11);
    const cardColor = Color(0xFF0F172A);
    const accentColor = Color(0xFF3B82F6);

    return Scaffold(
      backgroundColor: bgColor,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo Icon
                const Icon(
                  Icons.shield_outlined,
                  size: 80,
                  color: accentColor,
                ),
                const SizedBox(height: 16),
                const Text(
                  'TravelSafetySOS',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isLogin ? 'Sign in to access safety tools' : 'Create a travel safety account',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 32),

                // Error alert box
                if (_errorMsg.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      border: Border.all(color: Colors.red.withOpacity(0.3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _errorMsg,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Input fields Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    children: [
                      if (!_isLogin) ...[
                        TextFormField(
                          controller: _nameController,
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Full Name',
                            labelStyle: TextStyle(color: Colors.grey),
                            prefixIcon: Icon(Icons.person, color: Colors.grey),
                          ),
                          validator: (val) => val!.isEmpty ? 'Name required' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          style: const TextStyle(color: Colors.white),
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Phone Number',
                            labelStyle: TextStyle(color: Colors.grey),
                            prefixIcon: Icon(Icons.phone, color: Colors.grey),
                          ),
                          validator: (val) => val!.isEmpty ? 'Phone number required' : null,
                        ),
                        const SizedBox(height: 16),
                      ],
                      TextFormField(
                        controller: _emailController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          labelStyle: TextStyle(color: Colors.grey),
                          prefixIcon: Icon(Icons.email, color: Colors.grey),
                        ),
                        validator: (val) => val!.contains('@') ? null : 'Enter a valid email',
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        style: const TextStyle(color: Colors.white),
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          labelStyle: TextStyle(color: Colors.grey),
                          prefixIcon: Icon(Icons.lock, color: Colors.grey),
                        ),
                        validator: (val) => val!.length >= 6 ? null : 'Password too short (min 6 chars)',
                      ),
                      if (!_isLogin) ...[
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _mpinController,
                          style: const TextStyle(color: Colors.white, letterSpacing: 8),
                          obscureText: true,
                          keyboardType: TextInputType.number,
                          maxLength: 4,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            labelText: '4-Digit Security MPIN',
                            labelStyle: TextStyle(color: Colors.grey, letterSpacing: 0),
                            prefixIcon: Icon(Icons.security, color: Colors.grey),
                            counterText: '',
                          ),
                          validator: (val) {
                            if (val!.length != 4 || int.tryParse(val) == null) {
                              return 'Enter a 4-digit number';
                            }
                            return null;
                          },
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: accentColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          _isLogin ? 'Sign In' : 'Register',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                ),
                const SizedBox(height: 16),

                TextButton(
                  onPressed: () {
                    setState(() {
                      _isLogin = !_isLogin;
                      _errorMsg = '';
                    });
                  },
                  child: Text(
                    _isLogin ? 'Need an account? Register here' : 'Already have an account? Sign in',
                    style: const TextStyle(color: accentColor),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
