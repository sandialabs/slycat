#!/bin/bash
set -e

userConfPath="/usr/local/etc/sshd/sshd-users.conf"
userConfFinalPath="/var/run/sshd-users.conf"

function printHelp() {
    echo "Add users as command arguments, STDIN or mounted in $userConfPath"
    echo "Syntax: user:pass[:e][:uid[:gid]]..."
    echo "Use --readme for more information and examples."
}

function createUser() {
    IFS=':' read -a param <<< $@
    user="${param[0]}"
    pass="${param[1]}"

    if [ "${param[2]}" == "e" ]; then
        chpasswdOptions="-e"
        uid="${param[3]}"
        gid="${param[4]}"
    else
        uid="${param[2]}"
        gid="${param[3]}"
    fi

    if [ -z "$user" ]; then
        echo "FATAL: You must at least provide a username."
        exit 1
    fi

    mkdir -vp "/home/$user"
    
    useraddOptions="--no-create-home --no-user-group --shell /bin/bash --home-dir /home/$user"

    if [ -n "$uid" ]; then
        useraddOptions="$useraddOptions --non-unique --uid $uid"
    fi

    if [ -n "$gid" ]; then
        if ! $(cat /etc/group | cut -d: -f3 | grep -q "$gid"); then
            groupadd --gid $gid $gid
        fi

        useraddOptions="$useraddOptions --gid $gid"
    fi
    
    useradd $useraddOptions $user
    chown $(id -u $user):$(id -g $user) /home/$user
    chmod 750 /home/$user

    if [ -z "$pass" ]; then
        pass="$(echo `</dev/urandom tr -dc A-Za-z0-9 | head -c256`)"
        chpasswdOptions=""
    fi

    echo "$user:$pass" | chpasswd $chpasswdOptions

    # Add SSH keys to authorized_keys with valid permissions
    if [ -d /home/"$user"/.ssh/keys ]; then
        cat /home/$user/.ssh/keys/* >> /home/$user/.ssh/authorized_keys
        chown $user /home/$user/.ssh/authorized_keys
        chmod 600 /home/$user/.ssh/authorized_keys
    fi
}

if [[ $1 =~ ^--help$|^-h$ ]]; then
    printHelp
    exit 0
fi

# Create users only on first run
if [ ! -f "$userConfFinalPath" ]; then

    # Append mounted config to final config
    if [ -f "$userConfPath" ]; then
        cat "$userConfPath" > "$userConfFinalPath"
    fi

    # Append users from arguments to final config
    for user in "$@"; do
        echo "$user" >> "$userConfFinalPath"
    done

    # Append users from STDIN to final config
    if [ ! -t 0 ]; then
        while IFS= read -r user || [[ -n "$user" ]]; do
            echo "$user" >> "$userConfFinalPath"
        done
    fi

    # Check that we have users in config
    if [ "$(cat "$userConfFinalPath" | wc -l)" == 0 ]; then
        echo "FATAL: No users provided!"
        printHelp
        exit 3
    fi

    # Import users from final conf file
    while IFS= read -r user || [[ -n "$user" ]]; do
        createUser "$user"
    done < "$userConfFinalPath"

    # Source custom scripts, if any
    if [ -d /usr/local/etc/sshd/conf.d ]; then
        for f in /usr/local/etc/sshd/conf.d/*; do
            [ -x "$f" ] && . "$f"
        done
        unset f
    fi
fi

/usr/sbin/sshd -D -e -f /usr/local/etc/sshd/sshd_config