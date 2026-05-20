import os

HANDLER_DIR = r'c:\Users\Chzy1\Desktop\agent\backend\internal\handler'

correct_id = '\u53c2\u6570\u9519\u8bef\uff1aid\u683c\u5f0f\u4e0d\u6b63\u786e'.encode('utf-8')
correct_days = '\u53c2\u6570\u9519\u8bef\uff1adays\u683c\u5f0f\u4e0d\u6b63\u786e'.encode('utf-8')

for fname in os.listdir(HANDLER_DIR):
    if not fname.endswith('.go'):
        continue
    fpath = os.path.join(HANDLER_DIR, fname)
    with open(fpath, 'rb') as f:
        data = f.read()

    changed = False

    error_prefix = b'response.Error(c, errors.CodeParamError, "'
    end_marker_corrupt = b'?)\n\t\treturn\n\t}'

    for prefix_marker, correct_bytes in [
        (b'strconv.Atoi', correct_days),
        (b'strconv.ParseUint', correct_id),
    ]:
        search_pos = 0
        while True:
            idx = data.find(prefix_marker, search_pos)
            if idx < 0:
                break
            err_idx = data.find(error_prefix, idx)
            if err_idx < 0 or err_idx - idx > 200:
                search_pos = idx + 1
                continue

            end_idx_corrupt = data.find(end_marker_corrupt, err_idx)
            if end_idx_corrupt < 0 or end_idx_corrupt - err_idx > 300:
                search_pos = idx + 1
                continue

            replacement = error_prefix + correct_bytes + b'")\n\t\treturn\n\t}'
            print(f'Fixed in {fname} at pos {err_idx}')

            data = data[:err_idx] + replacement + data[end_idx_corrupt + len(end_marker_corrupt):]
            changed = True
            search_pos = err_idx + len(replacement)

    if changed:
        with open(fpath, 'wb') as f:
            f.write(data)

print('Done')
