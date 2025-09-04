import logging
import json
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Azure Function triggered by Smartsheet webhook when a cell value changes.
    
    This function receives webhook data from Smartsheet and processes cell change events.
    """
    logging.info('Smartsheet webhook triggered')
    
    try:
        # Get the request body
        req_body = req.get_json()
        
        if not req_body:
            logging.warning('No JSON body received')
            return func.HttpResponse(
                "No JSON data received",
                status_code=400
            )
        
        logging.info(f'Received webhook data: {json.dumps(req_body, indent=2)}')
        
        # Smartsheet webhook structure typically includes:
        # - challenge (for webhook verification)
        # - events (list of events that triggered the webhook)
        
        # Handle webhook verification challenge
        if 'challenge' in req_body:
            challenge = req_body['challenge']
            logging.info(f'Responding to webhook challenge: {challenge}')
            return func.HttpResponse(
                json.dumps({"smartsheetHookResponse": challenge}),
                mimetype="application/json",
                status_code=200
            )
        
        # Process webhook events
        if 'events' in req_body:
            events = req_body['events']
            logging.info(f'Processing {len(events)} events')
            
            for event in events:
                process_event(event)
        
        # Return success response
        return func.HttpResponse(
            json.dumps({"status": "success", "message": "Webhook processed successfully"}),
            mimetype="application/json",
            status_code=200
        )
        
    except Exception as e:
        logging.error(f'Error processing webhook: {str(e)}')
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )

def process_event(event):
    """
    Process individual Smartsheet webhook event.
    
    Args:
        event (dict): Event data from Smartsheet webhook
    """
    try:
        event_type = event.get('eventType')
        object_type = event.get('objectType')
        
        logging.info(f'Processing event - Type: {event_type}, Object: {object_type}')
        
        # Focus on cell change events
        if event_type == 'updated' and object_type == 'cell':
            handle_cell_change(event)
        else:
            logging.info(f'Ignoring event type: {event_type} for object: {object_type}')
            
    except Exception as e:
        logging.error(f'Error processing event: {str(e)}')

def handle_cell_change(event):
    """
    Handle cell change events from Smartsheet.
    
    Args:
        event (dict): Cell change event data
    """
    try:
        # Extract relevant information
        sheet_id = event.get('sheetId')
        row_id = event.get('rowId')  
        cell_id = event.get('cellId')
        column_id = event.get('columnId')
        user_id = event.get('userId')
        timestamp = event.get('timestamp')
        
        # Log the cell change details
        logging.info('=' * 50)
        logging.info('🔄 CELL CHANGE DETECTED')
        logging.info('=' * 50)
        logging.info(f'📋 Sheet ID: {sheet_id}')
        logging.info(f'📍 Cell ID: {cell_id}')
        logging.info(f'🏷️  Column ID: {column_id}')
        logging.info(f'📝 Row ID: {row_id}')
        logging.info(f'👤 User ID: {user_id}')
        logging.info(f'⏰ Timestamp: {timestamp}')
        logging.info('=' * 50)
        
        # Here's where we'll expand functionality later
        # For now, we're just logging the basic information
        
        # TODO: Add Smartsheet API call to get the actual cell value
        # TODO: Add specific business logic based on cell changes
        # TODO: Add error handling and retry logic
        
        logging.info('✅ Cell change processed successfully')
        
    except Exception as e:
        logging.error(f'❌ Error handling cell change: {str(e)}')
        raise