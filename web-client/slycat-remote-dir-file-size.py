import paramiko
import re
import csv
import slycat.web.client
import getpass

parser = slycat.web.client.ArgumentParser()
parser.add_argument("file", default="-", help="Input CSV file.  Default: %(default)s")
parser.add_argument("--port", default=22, help="port number.  Default: %(default)s")
arguments = parser.parse_args()

print "host: ", arguments.host
print "port: ", arguments.port
print "file_path: ",arguments.file
print "user: ",arguments.user
if arguments.password is None:
    arguments.password = getpass.getpass("%s password: " % arguments.user)
# print "password: ", arguments.password

expression = re.compile("file://")
file_list=[]
with open(arguments.file) as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        for item in row:
            if bool(expression.search(row[item])):
                file_list.append(re.sub(r'file:\/\/[a-zA-Z]*\/', "/", row[item]))
    # print file_list

client = paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(arguments.host, username=arguments.user, password=arguments.password, port=int(arguments.port))

size = 0
for path in file_list:
    stdin, stdout, stderr = client.exec_command("ls -l %s | cut -d \" \" -f5" % path)
    # print path
    for line in stdout:
        size = size + int(line.strip('\n'))
        # print int(line.strip('\n'))
print size
