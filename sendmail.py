#!/usr/bin/env python3

import sys
import smtplib

server = "localhost:1025"
sender = 'from@fromdomain.com'
receivers = ['to@todomain.com', 'user2@example.com']

message = """From: From Person <from@fromdomain.com>
To: To Person <to@todomain.com>, User Two <user2@exmple.com>
Date: Sun, 31 Jul 2016 02:11:29 -0400 (EDT)
Subject: SMTP e-mail test blah <b>blah</b>

This is a test e-mail message.
You can ignore this.
"""

if len(sys.argv) > 0:
    server = sys.argv[1]

try:
    host, port = server.split(':')
    smtpObj = smtplib.SMTP(host, port)
    smtpObj.set_debuglevel(True)
    smtpObj.login("guest", "password")
    for i in range(10,15):
        receivers.append('user%s@blackbox.test.net' % i)
    smtpObj.sendmail(sender, receivers, message)         
    print("Successfully sent email")
except smtplib.SMTPException as e:
    print("Error: unable to send email due to:", e)

