import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

export default function QRScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        if (permission === null) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned || isVerifying) return;

        setScanned(true);
        setIsVerifying(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Lỗi', 'Bạn cần đăng nhập trên điện thoại trước.');
                router.back();
                return;
            }

            // data is the sessionId from the web QR
            const response = await axios.post(`${API_BASE_URL}/api/qrlogin/verify`, {
                sessionId: data
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                Alert.alert('Thành công', 'Đăng nhập trình duyệt thành công!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Lỗi', response.data.message || 'Xác thực thất bại');
                setScanned(false);
            }
        } catch (error) {
            console.error('QR Verify Error:', error);
            Alert.alert('Lỗi', 'Không thể kết nối với máy chủ hoặc mã QR không hợp lệ.');
            setScanned(false);
        } finally {
            setIsVerifying(false);
        }
    };

    if (!permission) {
        return <View style={styles.container}><Text style={{ color: 'white' }}>Yêu cầu quyền truy cập camera...</Text></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', textAlign: 'center', paddingHorizontal: 20 }}>
                    Không có quyền truy cập camera
                </Text>
                <TouchableOpacity
                    style={styles.rescanButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.rescanText}>Cấp quyền</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Quét mã QR đăng nhập</Text>
            </View>

            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.overlay}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.middleContainer}>
                    <View style={styles.unfocusedContainer}></View>
                    <View style={styles.focusedContainer}></View>
                    <View style={styles.unfocusedContainer}></View>
                </View>
                <View style={styles.unfocusedContainer}>
                    <Text style={styles.instructionText}>Di chuyển camera đến mã QR trên trình duyệt web</Text>
                    {scanned && (
                        <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
                            <Text style={styles.rescanText}>Quét lại</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'black',
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 10,
    },
    headerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    middleContainer: {
        flexDirection: 'row',
        height: 300,
    },
    focusedContainer: {
        width: 300,
        borderColor: '#7f001f',
        borderWidth: 2,
        borderRadius: 10,
    },
    instructionText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    rescanButton: {
        marginTop: 20,
        backgroundColor: '#7f001f',
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 20,
    },
    rescanText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
