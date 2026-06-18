const MAX_AVATAR_CHARS = 150000;

function validateAvatar(avatar_url) {
    if (avatar_url == null || avatar_url === '') return null; // not provided or clearing
    if (typeof avatar_url !== 'string' || !avatar_url.startsWith('data:image/')) {
        return 'Invalid photo format. Please upload an image file.';
    }
    if (avatar_url.length > MAX_AVATAR_CHARS) {
        return 'Image is too large. Please choose a smaller photo (it is compressed automatically, so a normal picture is fine).';
    }
    return null;
}

module.exports = { MAX_AVATAR_CHARS, validateAvatar };
