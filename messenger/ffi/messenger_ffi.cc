// messenger_ffi.cc - Dart FFI glue for messenger functionality
//
// Provides C-compatible interface for Dart integration

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

// Forward declarations for Rust functions (implemented in Rust)
extern int32_t messenger_init();
extern int32_t messenger_generate_pq_keypair(uint8_t* public_key_out, size_t* public_key_len);
extern int32_t messenger_pq_encapsulate(const uint8_t* their_public_key, size_t public_key_len,
                                       uint8_t* shared_secret_out, size_t* shared_secret_len,
                                       uint8_t* ciphertext_out, size_t* ciphertext_len);
extern int32_t messenger_pq_decapsulate(const uint8_t* ciphertext, size_t ciphertext_len,
                                       uint8_t* shared_secret_out, size_t* shared_secret_len);
extern int32_t messenger_encrypt_message(const uint8_t* plaintext, size_t plaintext_len,
                                        const uint8_t* shared_secret, size_t shared_secret_len,
                                        uint8_t* ciphertext_out, size_t* ciphertext_len);
extern int32_t messenger_decrypt_message(const uint8_t* ciphertext, size_t ciphertext_len,
                                        const uint8_t* shared_secret, size_t shared_secret_len,
                                        uint8_t* plaintext_out, size_t* plaintext_len);
extern void messenger_free_buffer(uint8_t* buffer);

// Error codes
#define MESSENGER_SUCCESS 0
#define MESSENGER_ERROR_INVALID_INPUT -1
#define MESSENGER_ERROR_ENCRYPTION_FAILED -2
#define MESSENGER_ERROR_DECRYPTION_FAILED -3
#define MESSENGER_ERROR_KEY_GENERATION_FAILED -4
#define MESSENGER_ERROR_INSUFFICIENT_BUFFER -5

// Buffer management helpers
typedef struct {
    uint8_t* data;
    size_t length;
    size_t capacity;
} messenger_buffer_t;

messenger_buffer_t* messenger_buffer_create(size_t capacity) {
    messenger_buffer_t* buffer = (messenger_buffer_t*)malloc(sizeof(messenger_buffer_t));
    if (!buffer) return NULL;
    
    buffer->data = (uint8_t*)malloc(capacity);
    if (!buffer->data) {
        free(buffer);
        return NULL;
    }
    
    buffer->length = 0;
    buffer->capacity = capacity;
    return buffer;
}

void messenger_buffer_free(messenger_buffer_t* buffer) {
    if (buffer) {
        if (buffer->data) {
            free(buffer->data);
        }
        free(buffer);
    }
}

// High-level Dart-friendly API
int32_t dart_messenger_init() {
    return messenger_init();
}

// Generate PQ keypair and return as allocated buffer
messenger_buffer_t* dart_messenger_generate_keypair() {
    messenger_buffer_t* buffer = messenger_buffer_create(4096); // Should be enough for PQ keys
    if (!buffer) return NULL;
    
    size_t key_len = buffer->capacity;
    int32_t result = messenger_generate_pq_keypair(buffer->data, &key_len);
    
    if (result != MESSENGER_SUCCESS) {
        messenger_buffer_free(buffer);
        return NULL;
    }
    
    buffer->length = key_len;
    return buffer;
}

// Encrypt message and return as allocated buffer
messenger_buffer_t* dart_messenger_encrypt(const uint8_t* plaintext, size_t plaintext_len,
                                          const uint8_t* shared_secret, size_t shared_secret_len) {
    // Estimate ciphertext size (plaintext + overhead)
    size_t estimated_size = plaintext_len + 256;
    messenger_buffer_t* buffer = messenger_buffer_create(estimated_size);
    if (!buffer) return NULL;
    
    size_t ciphertext_len = buffer->capacity;
    int32_t result = messenger_encrypt_message(plaintext, plaintext_len,
                                             shared_secret, shared_secret_len,
                                             buffer->data, &ciphertext_len);
    
    if (result != MESSENGER_SUCCESS) {
        messenger_buffer_free(buffer);
        return NULL;
    }
    
    buffer->length = ciphertext_len;
    return buffer;
}

// Decrypt message and return as allocated buffer
messenger_buffer_t* dart_messenger_decrypt(const uint8_t* ciphertext, size_t ciphertext_len,
                                          const uint8_t* shared_secret, size_t shared_secret_len) {
    // Estimate plaintext size
    size_t estimated_size = ciphertext_len + 256;
    messenger_buffer_t* buffer = messenger_buffer_create(estimated_size);
    if (!buffer) return NULL;
    
    size_t plaintext_len = buffer->capacity;
    int32_t result = messenger_decrypt_message(ciphertext, ciphertext_len,
                                             shared_secret, shared_secret_len,
                                             buffer->data, &plaintext_len);
    
    if (result != MESSENGER_SUCCESS) {
        messenger_buffer_free(buffer);
        return NULL;
    }
    
    buffer->length = plaintext_len;
    return buffer;
}

// Getters for Dart
uint8_t* messenger_buffer_get_data(messenger_buffer_t* buffer) {
    return buffer ? buffer->data : NULL;
}

size_t messenger_buffer_get_length(messenger_buffer_t* buffer) {
    return buffer ? buffer->length : 0;
}

#ifdef __cplusplus
}
#endif