import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  List<dynamic> _contacts = [];
  bool _loading = true;

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _relController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() {
      _loading = true;
    });
    final contacts = await ApiService.getContacts();
    setState(() {
      _contacts = contacts;
      _loading = false;
    });
  }

  Future<void> _addContact() async {
    if (!_formKey.currentState!.validate()) return;
    
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final rel = _relController.text.trim();

    final success = await ApiService.addContact(name, phone, email, rel);
    if (success) {
      _nameController.clear();
      _phoneController.clear();
      _emailController.clear();
      _relController.clear();
      _loadContacts();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Emergency Contact Added!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to add contact'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _deleteContact(String id) async {
    final success = await ApiService.deleteContact(id);
    if (success) {
      _loadContacts();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Guardian contact removed'), backgroundColor: Colors.orange),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const bgColor = Color(0xFF080B11);
    const cardColor = Color(0xFF0F172A);
    const accentColor = Color(0xFF3B82F6);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Emergency Guardians', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: cardColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: accentColor))
          : Column(
              children: [
                // Form Card
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'REGISTER NEW GUARDIAN',
                            style: TextStyle(
                              color: Colors.grey,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _nameController,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: const InputDecoration(
                              labelText: 'Guardian Name',
                              labelStyle: TextStyle(color: Colors.grey),
                              prefixIcon: Icon(Icons.person, color: Colors.grey),
                            ),
                            validator: (val) => val!.isEmpty ? 'Name required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _phoneController,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Phone Number',
                              labelStyle: TextStyle(color: Colors.grey),
                              prefixIcon: Icon(Icons.phone, color: Colors.grey),
                            ),
                            validator: (val) => val!.isEmpty ? 'Phone number required' : null,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _emailController,
                                  style: const TextStyle(color: Colors.white, fontSize: 14),
                                  keyboardType: TextInputType.emailAddress,
                                  decoration: const InputDecoration(
                                    labelText: 'Email (Optional)',
                                    labelStyle: TextStyle(color: Colors.grey),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextFormField(
                                  controller: _relController,
                                  style: const TextStyle(color: Colors.white, fontSize: 14),
                                  decoration: const InputDecoration(
                                    labelText: 'Relation (e.g. Mother)',
                                    labelStyle: TextStyle(color: Colors.grey),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _addContact,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accentColor,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('Add Guardian', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          )
                        ],
                      ),
                    ),
                  ),
                ),

                // Directory List
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    child: _contacts.isEmpty
                        ? const Center(
                            child: Text(
                              'No guardians registered. Register contacts to alert in case of safety trigger events!',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey, fontSize: 13),
                            ),
                          )
                        : ListView.builder(
                            itemCount: _contacts.length,
                            itemBuilder: (context, index) {
                              final contact = _contacts[index];
                              return Card(
                                color: cardColor,
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(color: Colors.white.withOpacity(0.03)),
                                ),
                                child: ListTile(
                                  title: Row(
                                    children: [
                                      Text(
                                        contact['name'] ?? '',
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(width: 8),
                                      if (contact['relationship'] != null && contact['relationship'].isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, py: 2),
                                          decoration: BoxDecoration(
                                            color: accentColor.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(color: accentColor.withOpacity(0.2)),
                                          ),
                                          child: Text(
                                            contact['relationship'],
                                            style: const TextStyle(color: accentColor, fontSize: 9, fontWeight: FontWeight.bold),
                                          ),
                                        )
                                    ],
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text(
                                        contact['phone'] ?? '',
                                        style: const TextStyle(color: Colors.grey, fontFamily: 'monospace'),
                                      ),
                                      if (contact['email'] != null && contact['email'].isNotEmpty)
                                        Text(
                                          contact['email'],
                                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                                        ),
                                    ],
                                  ),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.grey),
                                    onPressed: () => _deleteContact(contact['_id']),
                                    hoverColor: Colors.red.withOpacity(0.1),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                )
              ],
            ),
    );
  }
}
