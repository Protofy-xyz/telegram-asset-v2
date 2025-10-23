import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Tag, Router } from '@tamagui/lucide-icons';
import { DevicesModel } from './devicesSchemas';
import { API } from 'protobase';
import { DataTable2 } from 'protolib/components/DataTable2';
import { DataView } from 'protolib/components/DataView';
import { ButtonSimple } from 'protolib/components/ButtonSimple';
import { AdminPage } from 'protolib/components/AdminPage';
import { usePendingEffect } from 'protolib/lib/usePendingEffect';
import { CardBody } from 'protolib/components/CardBody';
import { ItemMenu } from 'protolib/components/ItemMenu';
import { Tinted } from 'protolib/components/Tinted';
import { useSubscription, Connector } from 'protolib/lib/mqtt';
import { flash, connectSerialPort } from "../devicesUtils";
import DeviceModal from 'protodevice/src/DeviceModal'
import * as deviceFunctions from 'protodevice/src/device'
import { Subsystems } from 'protodevice/src/Subsystem'
import { Paragraph, TextArea, XStack, YStack, Text, Button } from '@my/ui';
import { getPendingResult } from "protobase";
import { Pencil, UploadCloud, Navigation, Bug } from '@tamagui/lucide-icons';
import { usePageParams } from 'protolib/next';
import { closeSerialPort, onlineCompilerSecureWebSocketUrl, postYamlApiEndpoint, compileActionUrl, compileMessagesTopic, downloadDeviceFirmwareEndpoint } from "../devicesUtils";
import { SSR } from 'protolib/lib/SSR'
import { withSession } from 'protolib/lib/Session'
import { SelectList } from 'protolib/components/SelectList';

const MqttTest = ({ onSetStage, onSetModalFeedback, compileSessionId, stage }) => {
  var isDoneCompiling = false
  const [messages, setMessages] = useState([])
  const textareaRef = useRef(null);
  const { message } = useSubscription([compileMessagesTopic(compileSessionId)]);
  //keep a log of messages until success/failure
  //so we can inform the user of the problems if anything fails.

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (stage == "compile") {
      console.log("Compile Message: ", message);
      try {
        if (message?.message) {
          const data = JSON.parse(message?.message.toString());
          let modalMessage
          if (data.position != "undefined") {
            if (data.position && !isDoneCompiling) {
              modalMessage = `Current position in queue: ${data.position}\n Status: ${data.status}`
            } else {
              isDoneCompiling = true
              modalMessage = (
                <YStack gap="$2">
                  <Paragraph fontWeight={"600"}>Compiling firmware: </Paragraph>
                  {
                    messages.length > 0 && (
                      <Paragraph height={50} >
                        {messages
                          .filter((msg) => Object.keys(msg).length === 1)
                          .map((msg) => msg.message)
                          .slice(-1)[0]
                        }
                      </Paragraph>
                    )
                  }
                </YStack>
              )
            }
            onSetModalFeedback({ message: modalMessage, details: { error: false } });
          }
          if (data.event == 'exit' && data.code == 0) {
            isDoneCompiling = true
            setMessages([])
            console.log("Succesfully compiled");
            onSetStage('upload')
          } else if (data.event == 'exit' && data.code != 0) {
            isDoneCompiling = true
            console.error('Error compiling', messages)

            onSetModalFeedback({
              message: (
                <YStack f={1} jc="flex-start" gap="$2">
                  <Paragraph color="$red8" mt="$3" textAlign="center">
                    Error compiling code.
                  </Paragraph>
                  <Paragraph color="$red8" textAlign="center">
                    Please check your flow configuration.
                  </Paragraph>

                  <TextArea
                    ref={textareaRef}
                    f={1}
                    minHeight={150}
                    maxHeight="100%"
                    mt="$2"
                    mb="$4"
                    overflow="auto"
                    textAlign="left"
                    resize="none"
                    value={messages.map((ele) => ele.message).join('')}
                  />
                </YStack>
              ),
              details: { error: true }
            })

          }
          setMessages([...messages, data])
        }
      } catch (err) {
        console.log(err);
      }
    }
  }, [message])

  return <></>

}

const DevicesIcons = { name: Tag, deviceDefinition: BookOpen }

const sourceUrl = '/api/core/v1/devices'
const definitionsSourceUrl = '/api/core/v1/deviceDefinitions?all=1'

type DeviceModalStage = 'yaml' | 'compile' | 'write' | 'upload' | 'idle' | 'select-action' | 'confirm-erase' | 'done' | 'console'

export default {
  component: ({ pageState, initialItems, itemData, pageSession, extraData }: any) => {
    const { replace } = usePageParams(pageState)
    if (typeof window !== 'undefined') {
      Object.keys(deviceFunctions).forEach(k => (window as any)[k] = deviceFunctions[k])
    }
    const [showModal, setShowModal] = useState(false)
    const [eraseBeforeFlash, setEraseBeforeFlash] = useState(true)
    const [modalFeedback, setModalFeedback] = useState<any>()
    const [stage, setStage] = useState<DeviceModalStage | "">('')
    const yamlRef = React.useRef()
    const [targetDeviceName, setTargetDeviceName] = useState('')
    const [targetDeviceModel, setTargetDeviceModel] = useState(DevicesModel.load({}))
    const [consoleOutput, setConsoleOutput] = useState('')
    const [port, setPort] = useState<any>(null)
    const [compileSessionId, setCompileSessionId] = useState('')
    const [deviceDefinitions, setDeviceDefinitions] = useState(extraData?.deviceDefinitions ?? getPendingResult('pending'))
    usePendingEffect((s) => { API.get({ url: definitionsSourceUrl }, s) }, setDeviceDefinitions, extraData?.deviceDefinitions)
    const [logsRequested, setLogsRequested] = useState(false)
    const [serialChooser, setSerialChooser] = useState<null | {
      reqId: string; ports: Array<{
        portId: string;
        displayName?: string;
        vendorId?: string;
        productId?: string;
        serialNumber?: string;
        portName?: string;
      }>
    }>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const isReadingRef = useRef(false);
    const [logSourceChooserOpen, setLogSourceChooserOpen] = useState(false);
    const [logSource, setLogSource] = useState<null | 'mqtt' | 'usb'>(null);
    const [currentDeviceHasMqtt, setCurrentDeviceHasMqtt] = useState(false);
    
    const hasMqttSubsystem = (subs: any): boolean => {
      if (!subs) return false;
      if (Array.isArray(subs)) {
        return subs.some((s) => {
          const v = (s?.type ?? s?.name ?? s?.id ?? '').toString().toLowerCase();
          return v.includes('mqtt');
        });
      }
      if (typeof subs === 'object') {
        const keyHas = Object.keys(subs).some((k) => k.toLowerCase().includes('mqtt'));
        const valHas = Object.values(subs).some((s: any) => {
          const v = (s?.type ?? s?.name ?? s?.id ?? '').toString().toLowerCase();
          return v.includes('mqtt');
        });
        return keyHas || valHas;
      }
      return false;
    };


    useEffect(() => {
      const api = (window as any)?.serial;
      if (!api) return;

      // initial open (sets list)
      const offOpen =
        api.onChooserOpen?.(({ reqId, ports }) => {
          console.log("🤖 ~ ports:", ports)
          setSerialChooser({ reqId, ports });
        });

      // live updates (plug/unplug)
      const offUpdate =
        api.onChooserUpdate?.(({ reqId, ports }) => {
          setSerialChooser((prev) => {
            if (!prev || prev.reqId !== reqId) return prev;
            return { reqId, ports };
          });
        });

      return () => {
        if (typeof offOpen === 'function') offOpen();
        if (typeof offUpdate === 'function') offUpdate();
      };
    }, []);

    const handleChoosePort = (portId: string) => {
      try {
        (window as any)?.serial?.choose(serialChooser?.reqId, String(portId));
      } finally {
        setSerialChooser(null);
      }
    };
    
    const handleCancelChooser = () => {
      try {
        (window as any)?.serial?.cancel(serialChooser?.reqId);
      } finally {
        setSerialChooser(null);
      }
    };


    const flashDevice = async (device, yaml?) => {
      setTargetDeviceName(device.data.name)
      setTargetDeviceModel(device)
      yamlRef.current = yaml ?? await device.getYaml()
      console.log("TURBO YAML PARAMETER: ", yaml)
      setShowModal(true)
      try {
        setStage('yaml')
      } catch (e) {
        console.error('error writting firmware: ', e)
      }
    }

    const onSelectPort = async () => {
      const { port, error } = await connectSerialPort()
      if (!port || error) {
        setModalFeedback({ message: error || 'No port detected.', details: { error: true } })
        return
      }
      // setStage('write')
      setPort(port)
      setStage("select-action")
    }

    const handleYamlStage = async () => {

      const uploadYaml = async (yaml: string) => {
        try {
          const response = await API.post(postYamlApiEndpoint(targetDeviceName), { yaml });
          const { data } = response
          console.log("CompileSessionId:", data.compileSessionId);
          setCompileSessionId(data.compileSessionId);
          return data.compileSessionId;
        } catch (err) {
          const errorMessage = "Error on fetch petition to compile.protofy.xyz: " + err;
          console.log(errorMessage);
          setModalFeedback({ message: errorMessage, details: { error: true } });
          throw errorMessage;
        }
      }

      const getBinary = async (sessionId: string) => {

        const isBinaryAvailable = async (deviceName: string, sessionId: string) => {
          const url = downloadDeviceFirmwareEndpoint(deviceName, sessionId);
          const response = await fetch(url);
          return response.ok;
        }

        const binaryExists = await isBinaryAvailable(targetDeviceName, sessionId);

        if (binaryExists) {
          // Binary exists, skip compilation and go to upload
          const message = 'Binary already exists. Skipping compilation.';
          setStage('upload');
          setModalFeedback({ message, details: { error: false } });
          console.log(message);
        } else {
          // Binary not found, proceed to compile
          setTimeout(() => {
            setStage('compile');
          }, 1000);
        }

        if (targetDeviceModel) {
          await targetDeviceModel.setUploaded();
        } else {
          console.log('🤖 No targetDeviceModel');
        }
      }

      try {
        const sessionId = await uploadYaml(yamlRef.current);
        await getBinary(sessionId);
      } catch (err) {
        setModalFeedback({
          message: 'Error connecting to compilation server. Please verify your Internet connection.',
          details: { error: true },
        });
      }
    }

    const compile = async () => {
      const response = await fetch(compileActionUrl(targetDeviceName, compileSessionId))
      const data = await response.json()
    }

    const write = async () => {

      const flashCb = (msgObj) => {
        console.log(msgObj);
        setModalFeedback(state => state = msgObj)
      }

      try {
        await flash((msg) => setModalFeedback(msg), targetDeviceName, compileSessionId, eraseBeforeFlash) //TODO: eraseBeforeFlash
        setStage('idle');
      } catch (e) {
        flashCb({
          message:
            'Error writing the device. Check that the USB connection and serial port are correctly configured.',
          details: { error: true },
        });
      }
    }


    const startUploadStage = () => {
      // getWebSocket()?.close()
      const chromiumBasedAgent =
        navigator.userAgent.includes('Chrome') ||
        navigator.userAgent.includes('Edge') ||
        navigator.userAgent.includes('Opera');

      if (chromiumBasedAgent) {
        setModalFeedback({ message: 'Connect your device and click select to chose the port. ', details: { error: false } });
        console.log('chormium based true');
      } else {
        console.log('chormium based very false');
        setModalFeedback({ message: 'You need Chrome, Opera or Edge to upload the code to the device.', details: { error: true } });
      }
    }

    const startConsole = async () => {
      if (!port) {
        console.error('No port selected');
        return;
      }

      // Prevent multiple readers
      if (isReadingRef.current || readerRef.current) {
        console.warn('Already reading from port');
        return;
      }

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        if (!port.readable) {
          console.error('Port has no readable stream');
          return;
        }
        if (port.readable.locked) {
          // Another reader still holds the lock; bail out cleanly
          console.warn('Readable stream is locked; cannot start another reader.');
          return;
        }

        reader = port.readable.getReader();
        readerRef.current = reader;
        isReadingRef.current = true;

        const decoder = new TextDecoder();

        while (isReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            setConsoleOutput(prev => prev + decoder.decode(value));
          }
        }
      } catch (err) {
        // Will often be a DOMException: "The device has been lost" or "readable stream is locked"
        console.error('Error reading from port:', err);
      } finally {
        // Reader cleanup (don’t close the port here; do it in stopConsole)
        try {
          if (readerRef.current) {
            try { await readerRef.current.releaseLock(); } catch { }
          }
        } finally {
          readerRef.current = null;
          isReadingRef.current = false;
        }
      }
    };
    const stopConsole = async () => {
      isReadingRef.current = false;

      // Stop MQTT log piping as well
      setLogSource(null); // reset source so subscription clears

      if (readerRef.current) {
        try { await readerRef.current.cancel(); } catch { }
        try { await readerRef.current.releaseLock(); } catch { }
        readerRef.current = null;
      }

      // Now close the port (only after all locks are released)
      try {
        // If there’s a writer elsewhere, make sure it’s released before closing
        if (port && !port.readable?.locked && !port.writable?.locked) {
          await port.close();
        } else if (port && !port.readable?.locked) {
          // If writable is still locked by something else, skip closing to avoid throw
          try { await port.close(); } catch (e) { /* ignore if still locked */ }
        }
      } catch (e) {
        console.warn('Error closing port:', e);
      } finally {
        setPort(null);
      }
    };

    useEffect(() => {
      // When leaving console stage, stop reading/close port
      if (stage !== 'console') return;
      return () => { stopConsole(); }; // cleanup when stage changes away from console
    }, [stage]);
    
    useEffect(() => {
      const processStage = async () => {

        console.log('Stage:', stage);

        switch (stage) {
          case 'yaml': await handleYamlStage(); break;
          case 'compile': await compile(); break;
          // case 'select-action': await onSelectPort(); break;
          // case "confirm-erase": setStage("write"); break;
          case 'write': await write(); break;
          case 'upload': startUploadStage(); break;
          case 'console':
            // If USB was chosen, only start USB reader. For MQTT we append via separate effect.
            if (logSource === 'usb') startConsole();
            break;
        }

      };

      processStage();
    }, [stage, logSource]);

    // ===== MQTT log piping =====
    // Subscribe dynamically only when MQTT is the chosen source.
    const mqttDebugTopic = logSource === 'mqtt' && targetDeviceName
      ? [`devices/${targetDeviceName}/debug`]
      : [];

    const { message: mqttLogMessage } = useSubscription(mqttDebugTopic);

    useEffect(() => {
      if (logSource !== 'mqtt') return;
      const raw = mqttLogMessage?.message;
      if (!raw) return;

      try {
        const text =
          typeof raw === 'string'
            ? raw
            : raw.toString?.() ?? String(raw);

        // Normalize CRLF/CR to LF and ensure line breaks between chunks
        const normalized = text.replace(/\r\n|\r/g, '\n');

        setConsoleOutput(prev => {
          const prevEndsWithNL = prev?.endsWith('\n') ?? true;
          const nextStartsWithNL = normalized.startsWith('\n');
          const nextEndsWithNL = normalized.endsWith('\n');

          // Add a separator \n if previous chunk didn’t end with one and next doesn’t start with one
          const sep = !prevEndsWithNL && !nextStartsWithNL ? '\n' : '';

          // Also make sure the appended chunk ends with \n so lines don’t glue together
          const tail = nextEndsWithNL ? '' : '\n';

          return (prev || '') + sep + normalized + tail;
        });
      } catch {
        setConsoleOutput(prev => (prev || '') + '\n' + String(raw) + '\n');
      }
    }, [mqttLogMessage, logSource]);

    // ===== Actions =====
    const extraMenuActions = [
      {
        text: "Manage firmware",
        icon: UploadCloud,
        action: (element) => { flashDevice(element) },
        isVisible: (element) => true
      },
      {
        text: "Edit config file",
        icon: Pencil,
        action: (element) => { replace('editFile', element.getConfigFile()) },
        isVisible: (element) => element.isInitialized() && element.getConfigFile()
      },
      {
        text: "Upload config file",
        icon: UploadCloud,
        action: async (element) => {
          try {
            var result = await API.get("/api/v1/esphome/" + element.data.name + "/yaml")
            flashDevice(element, result.data.yaml)
          } catch (err) {
            console.error(err)
          }

        },
        isVisible: (element) => element.isInitialized() && element.getConfigFile()
      },
      {
        text: "View logs",
        icon: Bug,
        action: async (element) => {
          setTargetDeviceName(element.data.name)
          setTargetDeviceModel(element)
          setLogsRequested(true)
          setConsoleOutput('')

          const hasMqtt = hasMqttSubsystem(element?.data?.subsystem);
          setCurrentDeviceHasMqtt(hasMqtt);

          if (hasMqtt) {
            // Offer choice
            setLogSourceChooserOpen(true);
          } else {
            // USB-only
            const { port, error } = await connectSerialPort();
            if (error === 'Any port selected') {
              setLogsRequested(false);
              setLogSource(null);
              return;
            }
            if (!port || error) {
              setLogsRequested(false);
              setLogSource(null);
              setModalFeedback({ message: error || 'No port detected.', details: { error: true } });
              return;
            }
            setPort(port);
            setLogSource('usb');
            setShowModal(true);
            setStage('console');
          }
        },
        isVisible: (element) => true
      }


    ]
    const chooseLogsSource = async (source: 'mqtt' | 'usb') => {
      setLogSourceChooserOpen(false);

      if (source === 'usb') {
        // Try to open the port BEFORE opening the modal
        const { port, error } = await connectSerialPort();

        if (error === 'Any port selected') {
          // User cancelled chooser — do nothing, keep modal closed
          setLogsRequested(false);
          setLogSource(null);
          return;
        }

        if (!port || error) {
          // Opening failed — keep modal closed, optionally surface feedback
          setLogsRequested(false);
          setLogSource(null);
          setModalFeedback({ message: error || 'No port detected.', details: { error: true } });
          return;
        }

        // Success: set up state, THEN open modal + console
        setPort(port);
        setLogSource('usb');
        setConsoleOutput('');
        setShowModal(true);
        setStage('console'); // startConsole will run via the effect because logSource === 'usb'
        return;
      }

      // MQTT path: open modal immediately; subscription effect will feed logs
      setLogSource('mqtt');
      setConsoleOutput('');
      setShowModal(true);
      setStage('console');
      setModalFeedback({
        message: `Subscribing to MQTT topic: devices/${targetDeviceName}/debug`,
        details: { error: false },
      });
    };


    const cancelLogsSource = () => {
      setLogSourceChooserOpen(false);
      setLogsRequested(false);
      setLogSource(null);
    }

    return (<AdminPage title="Devices" pageSession={pageSession}>
      <Connector brokerUrl={onlineCompilerSecureWebSocketUrl()}>
        <DeviceModal
          stage={stage}
          onCancel={async () => {
            if (logsRequested || stage === 'console') {
              await stopConsole();
              setLogsRequested(false);
            }
            setShowModal(false);
            setStage("");
          }}
          onSelect={onSelectPort}
          eraseBeforeFlash={eraseBeforeFlash}
          setEraseBeforeFlash={setEraseBeforeFlash}
          modalFeedback={modalFeedback}
          showModal={showModal}
          selectedDevice={targetDeviceModel}
          compileSessionId={compileSessionId}
          onSelectAction={(next) => {
            if (next === 'console') {
              // Force USB logs, assume port is already connected
              setConsoleOutput('');
              setLogSource('usb');

              if (!port) {
                // Guard just in case the port isn't actually set
                setModalFeedback({
                  message: 'Serial port is not open. Please connect the device first.',
                  details: { error: true },
                });
                return;
              }

              setStage('console'); // startConsole() will run via the [stage, logSource] effect
              return;
            }

            setStage(next);
          }}
          consoleOutput={consoleOutput}
          logSource={logSource}
        // port={port}
        />
        <MqttTest onSetStage={(v) => setStage(v)} onSetModalFeedback={(v) => setModalFeedback(v)} compileSessionId={compileSessionId} stage={stage} />
      </Connector>
      <DataView
        entityName="devices"
        defaultView={"grid"}
        toolBarContent={
          <XStack mr={"$2"} f={1} jc='flex-end'>
            <Tinted>
              <Button icon={BookOpen} mah="30px" onPress={() => document.location.href = '/workspace/deviceDefinitions'}>
                Definitions
              </Button>
            </Tinted>
          </XStack>
        }
        itemData={itemData}
        sourceUrl={sourceUrl}
        initialItems={initialItems}
        name="device"
        columns={DataTable2.columns(
          DataTable2.column("name", row => row.name, "name"),
          DataTable2.column("device definition", row => row.deviceDefinition, "deviceDefinition"),
          DataTable2.column("config", row => row.config, false, (row) => <ButtonSimple onPress={(e) => { flashDevice(DevicesModel.load(row)) }}>Upload</ButtonSimple>)
        )}
        customFields={{
          deviceDefinition: {
            component: (path, data, setData, mode) => {
              const definitions = deviceDefinitions.isLoaded ? deviceDefinitions.data.items.map(definition => definition.name) : []
              return <SelectList
                //@ts-ignore
                f={1}
                title={definitions.length
                  ? 'Definitions'
                  : <YStack f={1} ai="center" p={"$2"} py={"$6"} gap="$4">
                    <Tinted>
                      <Text fos={14} fow={"600"}>You don't have any definitions yet</Text>
                      <Button icon={Navigation} onPress={() => document.location.href = '/workspace/deviceDefinitions'} >
                        Go to definitions
                      </Button>
                    </Tinted>
                  </YStack>
                }
                placeholder={'Select a definition'}
                elements={definitions}
                value={data}
                setValue={(v) => setData(v)}
              />
            }
          }
        }}
        model={DevicesModel}
        pageState={pageState}
        icons={DevicesIcons}
        dataTableGridProps={{
          disableItemSelection: true,
          itemMinWidth: 500,
          onSelectItem: (item) => { },
          getBody: (data) => <CardBody title={data.name} separator={false}>
            <XStack right={20} top={20} position={"absolute"}>
              <ItemMenu type="item" sourceUrl={sourceUrl} onDelete={async (sourceUrl, deviceId?: string) => {
                await API.get(`${sourceUrl}/${deviceId}/delete`)
              }} deleteable={() => true} element={DevicesModel.load(data)} extraMenuActions={extraMenuActions} />
            </XStack>
            <YStack f={1}>
              {data?.subsystem
                ? <Subsystems subsystems={data.subsystem} deviceName={data.name} />
                : (
                  <>
                    <Paragraph mt="20px" ml="20px" size={20}>{'You need to upload the device'}</Paragraph>
                    <ButtonSimple mt="20px" ml="20px" width={100} onPress={() => { flashDevice(DevicesModel.load(data)); }}>Upload</ButtonSimple>
                  </>
                )
              }
            </YStack>
          </CardBody>
        }}
        extraMenuActions={extraMenuActions}
      />
      {/* INSERT HERE: Electron serial chooser UI (web keeps native chooser) */}
      {serialChooser && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          jc="center"
          ai="center"
          zi={2147483647}
          pointerEvents="auto"
        >
          <YStack w={520} maw={520} p="$4" br="$4" bw={1} bc="$color3" gap="$3" alignItems="center">
            <Paragraph size="$6" fow="700">Select a serial port</Paragraph>

            <YStack mah={280} overflow="auto" gap="$2">
              {serialChooser.ports.length ? (
                serialChooser.ports.map((p) => (
                  <Button
                    key={p.portId}
                    onPress={() => handleChoosePort(p.portId)}
                    justifyContent="center"
                  >
                    <Text fow="600">
                      {`${p.displayName || p.portId || 'Unknown device'}${p.portName ? ` (${p.portName})` : ''}`}
                    </Text>
                  </Button>
                ))
              ) : (
                <Paragraph opacity={0.8}>
                  No ports found. Plug your device and try again.
                </Paragraph>
              )}
            </YStack>

            <XStack jc="flex-end" gap="$2" mt="$2">
              <Button theme="alt1" onPress={handleCancelChooser}>Cancel</Button>
            </XStack>
          </YStack>
        </YStack>
      )}

      {/* NEW: Logs source chooser overlay */}
      {logSourceChooserOpen && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          jc="center"
          ai="center"
          zi={2147483647}
          pointerEvents="auto"
          px="$4"
        >
          <YStack w={520} maw={520} p="$4" br="$4" bw={1} bc="$color3" gap="$3" ai="stretch" bg="$color1">
            <Paragraph size="$6" fow="700" ta="center">Choose log source</Paragraph>
            <Paragraph ta="center" opacity={0.8}>
              Where do you want to read logs from for <Text fow="700">{targetDeviceName || 'device'}</Text>?
            </Paragraph>
            <YStack gap="$2" mt="$2">
              {currentDeviceHasMqtt && (
                <Button onPress={() => chooseLogsSource('mqtt')}>
                  MQTT
                </Button>
              )}
              <Button onPress={() => chooseLogsSource('usb')}>
                USB
              </Button>
            </YStack>
            <XStack jc="flex-end" gap="$2" mt="$2">
              <Button theme="alt1" onPress={cancelLogsSource}>Cancel</Button>
            </XStack>
          </YStack>
        </YStack>
      )}
    </AdminPage>)
  },
  getServerSideProps: SSR(async (context) => withSession(context, ['admin']))
}