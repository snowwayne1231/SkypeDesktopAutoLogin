import os, re, time
import win32gui
import win32api
import win32con
# import win32event
# import win32process
# import subprocess
# import win32com.client
from ctypes import windll
from tkinter import Tk, messagebox
from tkinter.filedialog import askopenfilename

SKYPE_REG = re.compile('^Skype*')
SKYPE_CLASS_REG = re.compile('^Chrome_WidgetWin_1*')
SKYPE_CLASS_RENDER_REG = re.compile('Chrome_RenderWidgetHostHWND')
SKYPE_CLASS_INTERMEDIATE_REG = re.compile('Intermediate D3D Window')
SKYPE_FOR_DESKTOP_CLASS_REG = re.compile('^CabinetWClass*')


        

def get_inner_skype_widget(skype_id):
    _max = 30
    _i = 0
    while True:
        time.sleep(1)
        if _i > _max:
            raise Exception('Time out of get inner skype widget.')
        _foreground = win32gui.GetForegroundWindow()
        # print('_foreground id: ', _foreground)
        # print('_foreground classname: ',win32gui.GetClassName(_foreground))
        # print('_foreground title: ',win32gui.GetWindowText(_foreground))
        if _foreground == skype_id:
            inner_id = win32gui.FindWindowEx(_foreground, 0, None, None)
            # print('FindWindowEx inner_id: ', inner_id)
            time.sleep(1)
            return inner_id
        else:
            windll.user32.SetForegroundWindow(skype_id)
        
        _i += 1

    return None


def handle_skype(handle_id):

    acc = 'snow.jhung@rv88.tw'
    pwd = 'Kowei03283'

    windll.user32.SetForegroundWindow(handle_id)
    clsname = win32gui.GetClassName(handle_id)
    print('HWND: {} , Class Name: {}'.format(handle_id, clsname))

    # inner_widget_id = get_inner_skype_widget(handle_id)
    # inner_widget_class_name = win32gui.GetClassName(inner_widget_id)
    # print('inner_widget_class_name: ', inner_widget_class_name)

    time.sleep(0.5)

    def is_login_screen(hwnd):
        _login_size = (454, 631)
        _min_size = (344, 621)

        _rect = win32gui.GetClientRect(hwnd)
        # print('_rect: ', _rect)

        time.sleep(3)
        windll.user32.SetForegroundWindow(hwnd)
        win32gui.MoveWindow(hwnd, 0, 0, _min_size[0], _min_size[1], 1)
        time.sleep(1)
        windll.user32.SetForegroundWindow(hwnd)
        _rect = win32gui.GetClientRect(hwnd)
        # print('_rect: ', _rect)
        # screen_xy = win32gui.ClientToScreen(handle_id, (0, 0))
        # print('screen xy = {}'.format(screen_xy))

        _login_width = _login_size[0]
        _width = _rect[2]
        if _login_width - _width > 60:
            win32gui.MoveWindow(hwnd, 0, 0, 960, 650, 1)
            return False
        else:
            return True

    def enter_str(hwnd, _str, delete=0):
        windll.user32.SetForegroundWindow(handle_id)

        for _ in _str:
            win32api.PostMessage(hwnd, win32con.WM_CHAR, ord(_), 0)
        
        win32api.PostMessage(hwnd, win32con.WM_KEYDOWN, toKeyCode('enter'), 0)

        if delete:
            time.sleep(0.2)
            for _ in range(delete):
                win32api.PostMessage(hwnd, win32con.WM_KEYDOWN, toKeyCode('back'), 0)
            time.sleep(0.2)
    

    if is_login_screen(handle_id):

        time.sleep(3)
        print('start.')
        _pos_start_btn = (227, 500)
        _pos_start_or_build_btn = (226, 375)
        _pos_middle_btn = (2250, 460)
        _pos_other_account_btn = (224, 402)
        _pos_login_account_input = (80, 210)
        


        def click(x,y):
            iparam = x + (y * 0x10000)
            # print('click iparam: ', iparam)
            windll.user32.SetForegroundWindow(handle_id)
            win32api.PostMessage(handle_id, win32con.WM_MOUSEMOVE, 1, iparam)
            time.sleep(0.2)
            win32api.PostMessage(handle_id, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, iparam)
            time.sleep(0.2)
            win32api.PostMessage(handle_id, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, iparam)
            time.sleep(0.2)
        
        

        click(_pos_start_btn[0], _pos_start_btn[1])
        click(_pos_middle_btn[0], _pos_middle_btn[1])
        click(_pos_other_account_btn[0], _pos_other_account_btn[1])
        click(_pos_start_or_build_btn[0], _pos_start_or_build_btn[1])
        time.sleep(1)
        # win32api.PostMessage(handle_id, win32con.WM_KEYDOWN, toKeyCode('enter'), 0)
        click(_pos_login_account_input[0], _pos_login_account_input[1])
        click(_pos_login_account_input[0], _pos_login_account_input[1])
        time.sleep(1)


        enter_str(handle_id, acc)
        time.sleep(1)
        enter_str(handle_id, pwd, delete=len(acc) + len(pwd))
        time.sleep(3)

        if is_login_screen(handle_id):
            win32gui.CloseWindow(handle_id)
            messagebox.showerror('Error', 'Logining failed.')
            exit(2)
        
    
    else:

        print('Is not login screen.')



def get_all_exsit_skypes(is_debug=False):
    result_list = []
    def _cb(handle_id, arg):
        _title = win32gui.GetWindowText(handle_id)
        if SKYPE_REG.match(_title):
            _clsname = win32gui.GetClassName(handle_id)
            
            if SKYPE_CLASS_REG.match(_clsname):
                result_list.append(handle_id)
            
            if is_debug:
                print('TITLE = {} ,  CLASS = {} , HWND_ID = {}'.format(_title, _clsname, handle_id))
    
    win32gui.EnumWindows(_cb, None)
    if is_debug:
        print('==================================')
    return result_list

def get_new_skype_id(old_ids):
    now_ids = get_all_exsit_skypes(True)
    new_id = None
    if len(now_ids) == len(old_ids) +1:
        for _ in now_ids:
            if _ not in old_ids:
                new_id = _
                break
    
    return new_id


def loop_handle_fn(Skype_exe):
    _exsit_skype_ids = get_all_exsit_skypes()
    if len(_exsit_skype_ids) == 0:
        # no skype opened
        program = Skype_exe
    else:
        # have skype launched
        program = Skype_exe + " --secondary"
    
    _exec = win32api.WinExec(program)
    _i = 0
    _max = 30

    while True:
        time.sleep(1)
        
        new_skype_id = get_new_skype_id(_exsit_skype_ids)
        if new_skype_id:
            time.sleep(3)
            handle_skype(new_skype_id)
            break
        else:
            if _i >= _max:
                raise Exception('Time Out of getting skype hwnd id.')
        _i += 1
    
    return True



def toKeyCode(c):
    keyCodeMap = {
        '0'       : 0x30,
        '1'       : 0x31,
        '2'       : 0x32,
        '3'       : 0x33,
        '4'       : 0x34,
        '5'       : 0x35,
        '6'       : 0x36,
        '7'       : 0x37,
        '8'       : 0x38,
        '9'       : 0x39,
        '+'       : win32con.VK_ADD,
        '-'       : win32con.VK_SUBTRACT,
        '*'       : win32con.VK_MULTIPLY,
        '/'       : win32con.VK_DIVIDE,
        '|'       : win32con.VK_SEPARATOR,
        '.'       : win32con.VK_DECIMAL,
        'del'     : win32con.VK_DELETE,
        'delete'  : win32con.VK_DELETE,
        'back'    : win32con.VK_BACK,
        'help'    : win32con.VK_HELP,
        'home'    : win32con.VK_HOME,
        'left'    : win32con.VK_LEFT,
        'right'   : win32con.VK_RIGHT,
        'down'    : win32con.VK_DOWN,
        'up'      : win32con.VK_UP,
        'tab'     : win32con.VK_TAB,
        ' '       : win32con.VK_SPACE,
        'enter'   : win32con.VK_RETURN,
    }

    if c.isalpha():
        c = c.lower()
        if len(c) == 1:
            keyCode = ord(c) - (0x60 - 0x40)
            return keyCode
        
    if c in keyCodeMap:
        keyCode = keyCodeMap[c]
    else:
        keyCode = 0
    
    return keyCode



def getBufferContent(hwnd):
    buf_size = win32gui.SendMessage(hwnd, win32con.WM_GETTEXTLENGTH, 0, 0)
    # print('buf_size: ', buf_size)
    buf = win32gui.PyMakeBuffer(buf_size)
    win32gui.SendMessage(hwnd, win32con.WM_GETTEXT, buf_size, buf)
    # print('_buf_str: ', str(buf))
    address, length = win32gui.PyGetBufferAddressAndLen(buf)
    text = win32gui.PyGetString(address, length)
    buf.release()
    return text




if __name__ == '__main__':
        
    try:

        Tk().withdraw()
        initialdir = r'C:\Program Files (x86)\Microsoft\Skype for Desktop'
        program = r"C:\Program Files (x86)\Microsoft\Skype for Desktop\Skype.exe"
        
        if os.path.isdir(initialdir):
            filename = askopenfilename(initialdir=initialdir, filetypes=[('exe', '.exe')])
        else:
            filename = askopenfilename(filetypes=[('exe', '.exe')])

        print(filename)
        _file_list = re.split(r'[\/\\]+', filename)
        _file = _file_list[-1]
        if re.match('Skype.exe', _file):
            loop_handle_fn(filename)
            messagebox.showinfo('Success', 'Done.')
        else:
            messagebox.showerror("Error", "It's not Skype.exe")

        
    except KeyboardInterrupt as ke:
        print('stop.')
        exit(2)
    except Exception as ee:
        print(ee)
        exit(2)

    print('done.')