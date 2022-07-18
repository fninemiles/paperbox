require 'net/smtp'
require 'faker'

if ARGV.length > 0 then
    server, port = ARGV[0].split(':')
else
    server, port = 'localhost', 1025
end

def craft_message(from_user, to_users, cc_users, bcc_users)
    to = to_users.map { |u| "#{u[:name]} <#{u[:mail]}>" }
    to = to.join(", ")
    cc = cc_users.map { |u| "#{u[:name]} <#{u[:mail]}>" }
    cc = cc.join(", ")
    bcc = bcc_users.map { |u| "#{u[:name]} <#{u[:mail]}>" }
    bcc = bcc.join(", ")
    from = "#{from_user[:name]} <#{from_user[:mail]}>"
    message = <<MESSAGE_END
From: #{from}
To: #{to}
Cc: #{cc}
Bcc: #{bcc}
Subject: #{Faker::Lorem.sentence}
Date: #{Faker::Time.backward(days: 14)}

#{Faker::Lorem.paragraph(sentence_count: 20)}

#{Faker::Lorem.paragraph(sentence_count: 30)}

MESSAGE_END

end

def make_user
    name = Faker::Name.name
    return { name: name, :mail => Faker::Internet.email(name: name) }
end


users = (1..10).map { make_user }
cc_users = (1..5).map { make_user }
bcc_users = (1..5).map { make_user }

Net::SMTP.start(server, port, 'localhost', 'guest', 'password', authtype: :plain, tls_verify: false) do |smtp|
    1000.times {
        sender = users.sample(1)[0]
        receivers = users.sample(4)
        msg = craft_message(sender, receivers, cc_users, bcc_users)
        puts(msg)
        smtp.send_message(msg, sender[:mail], receivers.map{|u| u[:mail]})
    }
end

