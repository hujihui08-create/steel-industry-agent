import os

fpath = r'c:\Users\Chzy1\Desktop\agent\backend\internal\handler\price_handler.go'
with open(fpath, 'rb') as f:
    data = f.read()

idx = data.find(b'strconv.Atoi')
print(f'strconv.Atoi at {idx}')

err_idx = data.find(b'response.Error(c, errors.CodeParamError, "', idx)
print(f'CodeParamError at {err_idx}, distance: {err_idx - idx}')

end_marker = b'?)\n\t\treturn\n\t}'
end_idx = data.find(end_marker, err_idx)
print(f'end ?) pattern at {end_idx}, distance: {end_idx - err_idx if end_idx > 0 else -1}')

# Also check for correct pattern
end_marker2 = b'")\n\t\treturn\n\t}'
end_idx2 = data.find(end_marker2, err_idx)
print(f'end ") pattern at {end_idx2}, distance: {end_idx2 - err_idx if end_idx2 > 0 else -1}')

# Show the bytes around the CodeParamError
if err_idx > 0:
    block = data[err_idx:err_idx+120]
    print()
    print('Block hex:', block.hex(' '))
    try:
        print('Block text:', block.decode('utf-8', errors='replace'))
    except:
        pass
