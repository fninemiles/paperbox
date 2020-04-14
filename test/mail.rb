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
Date: #{Faker::Time.backward(14)}

#{Faker::Lorem.paragraph(10)}

#{Faker::Lorem.paragraph(3)}

MESSAGE_END

end


users = (1..10).map {
    name = Faker::Name.name
    { :mail => Faker::Internet.email(name), :name => name }
}
cc_users = (1..5).map {
    name = Faker::Name.name
    { :mail => Faker::Internet.email(name), :name => name }
}
bcc_users = (1..5).map {
    name = Faker::Name.name
    { :mail => Faker::Internet.email(name), :name => name }
}
Net::SMTP.start(server, port, 'localhost', 'username', 'password', :plain) do |smtp|
    1000.times {
        sender = users.sample(1)[0]
        receivers = users.sample(4)
        msg = craft_message(sender, receivers, cc_users, bcc_users)
        puts(msg)
        smtp.send_message(msg, sender[:mail], receivers.map{|u| u[:mail]})
    }
end
