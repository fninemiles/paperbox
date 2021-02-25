# paperbox - SMTP Mail Server for Testing

This mail server stores all the mails sent to it. It will create mail box for new reciepient address.

To start a SMTP server listen on port 1025, and recieve all the mails.
```javascript
var paperbox = require('paperbox');

server = new paperbox();
server.listen();
```

## Choose Mail Store Types
### LevelDB
```
server = new paperbox({db_type: 'leveldb'});
```
### NeDB
```
server = new paperbox({db_type: 'nedb'});
```

## Test SMTP

Use `openssl` to STARTTLS with login:
```
$ openssl s_client -crlf -starttls smtp -connect 0.0.0.0:1025
...
250 STARTTLS
AUTH PLAIN AGptczFAam1zMS5uZXQAbm90Lm15LnJlYWwucGFzc3dvcmQ=
235 Authentication successful
mail from: <user1@test.example.com>
250 Accepted
rcpt to: <user2@test.example.com>
250 Accepted
data
354 End data with <CR><LF>.<CR><LF>
subject: Test Mail Server

This is a test mail from openssl client.
Please discard it.
.
250 OK: message queued
quit
221 Bye
closed

```
